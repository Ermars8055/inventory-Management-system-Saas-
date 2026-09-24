import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Vendor, User
from ..schemas import VendorOut, VendorCreate, VendorUpdate
from ..dependencies import require, same_org
from ..audit import log_action

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=list[VendorOut])
def list_vendors(user: User = Depends(require("vendors:read")), db: Session = Depends(get_db)):
    return db.query(Vendor).filter(Vendor.organization_id == user.organization_id).all()


@router.post("", response_model=VendorOut, status_code=201)
def create_vendor(body: VendorCreate, user: User = Depends(require("vendors:create")), db: Session = Depends(get_db)):
    existing_name = db.query(Vendor).filter(
        Vendor.organization_id == user.organization_id,
        Vendor.name == body.name,
    ).first()
    if existing_name:
        raise HTTPException(409, f"A vendor named '{body.name}' already exists")
    if body.email:
        existing = db.query(Vendor).filter(Vendor.organization_id == user.organization_id, Vendor.email == body.email).first()
        if existing:
            raise HTTPException(409, f"A vendor with email '{body.email}' already exists")
    vendor = Vendor(
        id=f"ven_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        name=body.name,
        contact_person=body.contact_person,
        phone=body.phone,
        email=body.email,
        address=body.address,
        vendor_type=body.vendor_type,
        attributes=body.attributes,
        purchase_history=[],
        outstanding_orders=[],
    )
    db.add(vendor)
    log_action(db, user, "create", "vendor", vendor.id,
               f"Created vendor: {body.name} (type={body.vendor_type or '—'})")
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: str, user: User = Depends(require("vendors:read")), db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    same_org(vendor.organization_id, user)
    return vendor


@router.put("/{vendor_id}", response_model=VendorOut)
def update_vendor(vendor_id: str, body: VendorUpdate, user: User = Depends(require("vendors:update")), db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    same_org(vendor.organization_id, user)
    changes = body.model_dump(exclude_none=True, by_alias=False)
    before = {k: getattr(vendor, k) for k in changes}
    for field, value in changes.items():
        setattr(vendor, field, value)
    log_action(db, user, "update", "vendor", vendor.id,
               f"Updated vendor: {vendor.name}", before=before, after=changes)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(vendor_id: str, user: User = Depends(require("vendors:delete")), db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    same_org(vendor.organization_id, user)
    log_action(db, user, "delete", "vendor", vendor.id,
               f"Deleted vendor: {vendor.name}")
    db.delete(vendor)
    db.commit()
