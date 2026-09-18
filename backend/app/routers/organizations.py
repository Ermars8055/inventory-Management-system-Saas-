import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Organization, User
from ..schemas import OrganizationOut, OrganizationCreate, OrganizationUpdate, ModulesUpdate, ConfigUpdate
from ..dependencies import get_current_user, require, same_org, get_plan_limits

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
