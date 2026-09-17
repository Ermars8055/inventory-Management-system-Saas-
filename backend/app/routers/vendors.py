import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Vendor, User
from ..schemas import VendorOut, VendorCreate, VendorUpdate
from ..dependencies import require, same_org

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=list[VendorOut])
def list_vendors(user: User = Depends(require("vendors:read")), db: Session = Depends(get_db)):
    return db.query(Vendor).filter(Vendor.organization_id == user.organization_id).all()


@router.post("", response_model=VendorOut, status_code=201)
def create_vendor(body: VendorCreate, user: User = Depends(require("vendors:create")), db: Session = Depends(get_db)):
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
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(vendor, field, value)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(vendor_id: str, user: User = Depends(require("vendors:delete")), db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    same_org(vendor.organization_id, user)
    db.delete(vendor)
    db.commit()
