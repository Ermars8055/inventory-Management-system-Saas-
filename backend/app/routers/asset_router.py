import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Asset
from ..schemas import AssetOut, AssetCreate, AssetUpdate

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
def list_assets(org_id: str = Query(...), db: Session = Depends(get_db)):
    return (
        db.query(Asset)
        .filter(Asset.organization_id == org_id)
        .order_by(Asset.created_at.desc())
        .all()
    )


@router.post("", response_model=AssetOut, status_code=201)
def create_asset(body: AssetCreate, db: Session = Depends(get_db)):
    asset_code = body.asset_code or _next_asset_code(db, body.organization_id, body.asset_type)
    a = Asset(
        id=f"ast_{int(time.time() * 1000)}",
        asset_code=asset_code,
        created_at=date.today().isoformat(),
        **{k: v for k, v in body.model_dump(by_alias=False).items() if k != "asset_code"},
    )
    a.asset_code = asset_code
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{asset_id}", response_model=AssetOut)
def update_asset(asset_id: str, body: AssetUpdate, db: Session = Depends(get_db)):
    a = db.query(Asset).filter(Asset.id == asset_id).first()
    if not a:
        raise HTTPException(404, "Asset not found")
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(a, field, value)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: str, db: Session = Depends(get_db)):
    a = db.query(Asset).filter(Asset.id == asset_id).first()
    if not a:
        raise HTTPException(404, "Asset not found")
    db.delete(a)
    db.commit()
