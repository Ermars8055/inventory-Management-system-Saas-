import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import PurchaseOrder
from ..schemas import PurchaseOrderOut, PurchaseOrderCreate, PurchaseOrderUpdate

router = APIRouter(prefix="/procurement", tags=["procurement"])

_seq = 0


def _next_po_number(db: Session, org_id: str) -> str:
    year = date.today().year
    count = db.query(PurchaseOrder).filter(PurchaseOrder.organization_id == org_id).count()
    return f"PO-{year}-{str(count + 1).zfill(4)}"


@router.get("", response_model=list[PurchaseOrderOut])
def list_orders(org_id: str = Query(...), db: Session = Depends(get_db)):
    return (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.organization_id == org_id)
        .order_by(PurchaseOrder.created_at.desc())
        .all()
    )


@router.post("", response_model=PurchaseOrderOut, status_code=201)
def create_order(body: PurchaseOrderCreate, db: Session = Depends(get_db)):
    po_number = body.po_number or _next_po_number(db, body.organization_id)
    po = PurchaseOrder(
        id=f"po_{int(time.time() * 1000)}",
        po_number=po_number,
        created_at=date.today().isoformat(),
        **{k: v for k, v in body.model_dump(by_alias=False).items() if k != "po_number"},
    )
    po.po_number = po_number
    db.add(po)
    db.commit()
    db.refresh(po)
    return po


@router.put("/{po_id}", response_model=PurchaseOrderOut)
def update_order(po_id: str, body: PurchaseOrderUpdate, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(po, field, value)
    db.commit()
    db.refresh(po)
    return po


@router.patch("/{po_id}/status", response_model=PurchaseOrderOut)
def update_status(po_id: str, status: str = Query(...), db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    po.status = status
    db.commit()
    db.refresh(po)
    return po


@router.delete("/{po_id}", status_code=204)
def delete_order(po_id: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    db.delete(po)
    db.commit()
