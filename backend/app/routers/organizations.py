import os
import time
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Organization, User
from ..schemas import OrganizationOut, OrganizationCreate, OrganizationUpdate, ModulesUpdate, ConfigUpdate
from ..dependencies import get_current_user, require, same_org, get_plan_limits
from ..module_fields import create_module_fields

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=list[OrganizationOut])
def list_organizations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Organization).filter(Organization.id == user.organization_id).all()


@router.get("/{org_id}", response_model=OrganizationOut)
def get_organization(org_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    same_org(org_id, user)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")
    return org


@router.put("/{org_id}", response_model=OrganizationOut)
def update_organization(org_id: str, body: OrganizationUpdate, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    same_org(org_id, user)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(org, field, value)
    db.commit()
    db.refresh(org)
    return org


@router.patch("/{org_id}/modules", response_model=OrganizationOut)
def update_modules(org_id: str, body: ModulesUpdate, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    same_org(org_id, user)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")
    limits = get_plan_limits(org_id, db)
    if len(body.enabled_modules) > limits["max_modules"]:
        raise HTTPException(403, f"Plan limit reached: {limits['max_modules']} modules max. Upgrade your plan to enable more.")
    org.enabled_modules = body.enabled_modules

    # Auto-create default custom fields for newly enabled modules
    create_module_fields(db, org_id, body.enabled_modules)

    db.commit()
    db.refresh(org)
    return org


@router.post("/init-module-fields")
def init_module_fields(user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    """Retroactively create default custom fields for all enabled modules. Safe to call multiple times."""
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")
    create_module_fields(db, org.id, org.enabled_modules or [])
    db.commit()
    return {"ok": True, "modules": org.enabled_modules}


@router.patch("/{org_id}/config", response_model=OrganizationOut)
def update_config(org_id: str, body: ConfigUpdate, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    same_org(org_id, user)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")
    current = dict(org.config or {})
    current.update(body.config)
    org.config = current  # Assign new dict so SQLAlchemy detects the change
    db.commit()
    db.refresh(org)
    return org


@router.post("/{org_id}/logo", response_model=OrganizationOut)
async def upload_logo(
    org_id: str,
    file: UploadFile = File(...),
    user: User = Depends(require("settings:update")),
    db: Session = Depends(get_db),
):
    """Upload org logo image (max 2MB, jpg/png only)."""
    same_org(org_id, user)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(400, "Logo must be under 2MB")
    if file.content_type not in ("image/jpeg", "image/png", "image/svg+xml"):
        raise HTTPException(400, "Only JPG, PNG, or SVG allowed")

    upload_dir = os.getenv("UPLOAD_DIR", "/data/uploads")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".png"
    filename = f"logo_{org_id}{ext}"
    path = os.path.join(upload_dir, filename)

    # Remove old logo if exists
    if org.logo_url:
        old_path = os.path.join(upload_dir, os.path.basename(org.logo_url))
        if os.path.exists(old_path):
            os.remove(old_path)

    with open(path, "wb") as f:
        f.write(content)

    org.logo_url = f"/files/logo/{filename}"
    db.commit()
    db.refresh(org)
    return org


@router.delete("/account", status_code=204)
def delete_account(user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    """Delete the entire org and all its data. Irreversible."""
    org_id = user.organization_id
    # Delete in order to respect foreign keys
    from ..models import Item, StockTransaction, Vendor, Recipient, Assignment, Batch, CustomField, ReceiptTemplate, ClassTemplate, ClassTemplateItem, PurchaseOrder, POLineItem, Quotation, QuotationItem, VendorQuote, VendorQuoteItem, MaintenanceTicket, Asset, OrgAuditLog, Notification, FileAttachment, Category
    for model in [VendorQuoteItem, VendorQuote, QuotationItem, Quotation, POLineItem, PurchaseOrder, ClassTemplateItem, ClassTemplate, FileAttachment, Notification, OrgAuditLog, Assignment, Recipient, MaintenanceTicket, Asset, Batch, CustomField, ReceiptTemplate, StockTransaction, Item, Vendor, Category]:
        db.query(model).filter(model.organization_id == org_id).delete()
    db.query(User).filter(User.organization_id == org_id).delete()
    db.query(Organization).filter(Organization.id == org_id).delete()
    db.commit()
