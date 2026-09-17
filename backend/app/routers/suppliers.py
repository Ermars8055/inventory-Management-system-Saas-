import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Supplier, User
from ..schemas import SupplierOut, SupplierCreate, SupplierUpdate
from ..dependencies import require, same_org

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierOut])
def list_suppliers(user: User = Depends(require("suppliers:read")), db: Session = Depends(get_db)):
    return db.query(Supplier).filter(Supplier.organization_id == user.organization_id).all()


@router.post("", response_model=SupplierOut, status_code=201)
def create_supplier(body: SupplierCreate, user: User = Depends(require("suppliers:create")), db: Session = Depends(get_db)):
    supplier = Supplier(
        id=f"sup_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        name=body.name,
        contact_person=body.contact_person,
        phone=body.phone,
        email=body.email,
        address=body.address,
        items_supplied=body.items_supplied,
        attributes=body.attributes,
        purchase_history=[],
        outstanding_orders=[],
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: str, user: User = Depends(require("suppliers:read")), db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    same_org(supplier.organization_id, user)
    return supplier


@router.put("/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: str, body: SupplierUpdate, user: User = Depends(require("suppliers:update")), db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    same_org(supplier.organization_id, user)
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: str, user: User = Depends(require("suppliers:delete")), db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    same_org(supplier.organization_id, user)
    db.delete(supplier)
    db.commit()
