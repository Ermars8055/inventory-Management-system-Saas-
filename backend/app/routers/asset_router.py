import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Asset, User
from ..schemas import AssetOut, AssetCreate, AssetUpdate
from ..dependencies import require, same_org

router = APIRouter(prefix="/assets", tags=["assets"])


def _next_asset_code(db: Session, org_id: str, asset_type: str) -> str:
    type_abbr = {
        "IT Equipment": "IT",
        "Furniture": "FRN",
        "Vehicle": "VHC",
        "Lab Equipment": "LAB",
        "Sports Equipment": "SPT",
    }.get(asset_type or "", "OTH")
    count = db.query(Asset).filter(Asset.organization_id == org_id).count()
    return f"AST-{type_abbr}-{str(count + 1).zfill(3)}"


@router.get("", response_model=list[AssetOut])
def list_assets(user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    return (
        db.query(Asset)
        .filter(Asset.organization_id == user.organization_id)
        .order_by(Asset.created_at.desc())
        .all()
    )


@router.post("", response_model=AssetOut, status_code=201)
def create_asset(body: AssetCreate, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    asset_code = body.asset_code or _next_asset_code(db, user.organization_id, body.asset_type)
    a = Asset(
        id=f"ast_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        asset_code=asset_code,
        name=body.name,
        asset_type=body.asset_type,
        assigned_to=body.assigned_to,
        department=body.department,
        location=body.location,
        condition=body.condition,
        status=body.status,
        purchase_date=body.purchase_date,
        value=body.value,
        notes=body.notes,
        created_at=date.today().isoformat(),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{asset_id}", response_model=AssetOut)
def update_asset(asset_id: str, body: AssetUpdate, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    a = db.query(Asset).filter(Asset.id == asset_id).first()
    if not a:
        raise HTTPException(404, "Asset not found")
    same_org(a.organization_id, user)
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(a, field, value)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: str, user: User = Depends(require("inventory:delete")), db: Session = Depends(get_db)):
    a = db.query(Asset).filter(Asset.id == asset_id).first()
    if not a:
        raise HTTPException(404, "Asset not found")
    same_org(a.organization_id, user)
    db.delete(a)
    db.commit()
