import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Organization, User
from ..schemas import OrganizationOut, OrganizationCreate, OrganizationUpdate, ModulesUpdate, ConfigUpdate
from ..dependencies import get_current_user, require, same_org

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=list[OrganizationOut])
def list_organizations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Organization).filter(Organization.id == user.organization_id).all()


@router.post("", response_model=OrganizationOut, status_code=201)
def create_organization(body: OrganizationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = Organization(
        id=f"org_{int(time.time() * 1000)}",
        name=body.name,
        industry=body.industry,
        enabled_modules=body.enabled_modules,
        plan="starter",
        logo_text=body.name[:3].upper(),
        created_at=__import__("datetime").date.today().isoformat(),
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


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
    org.enabled_modules = body.enabled_modules
    db.commit()
    db.refresh(org)
    return org


@router.patch("/{org_id}/config", response_model=OrganizationOut)
def update_config(org_id: str, body: ConfigUpdate, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    same_org(org_id, user)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")
    current = org.config or {}
    current.update(body.config)
    org.config = current
    db.commit()
    db.refresh(org)
    return org
