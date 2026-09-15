import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import PurchaseOrder, POLineItem, Item, StockTransaction
from ..schemas import PurchaseOrderOut, PurchaseOrderCreate, PurchaseOrderUpdate, ReceivePOBody

router = APIRouter(prefix="/procurement", tags=["procurement"])


def _next_po_number(db: Session, org_id: str) -> str:
    year = date.today().year
    count = db.query(PurchaseOrder).filter(PurchaseOrder.organization_id == org_id).count()
    return f"PO-{year}-{str(count + 1).zfill(4)}"


def _compute_status(qty: int, min_qty: int = 10) -> str:
    if qty == 0:
        return "out_of_stock"
    if qty <= min_qty:
        return "low_stock"
    return "in_stock"


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

    # Auto-compute amount from line items if not provided
    amount = body.amount
    if amount == 0 and body.line_items:
        amount = sum(li.quantity_ordered * li.unit_price for li in body.line_items)

    po = PurchaseOrder(
        id=f"po_{int(time.time() * 1000)}",
        organization_id=body.organization_id,
        po_number=po_number,
        supplier=body.supplier,
        supplier_id=body.supplier_id,
        items_desc=body.items_desc or (", ".join(li.item_name for li in body.line_items) if body.line_items else None),
        item_count=len(body.line_items) if body.line_items else body.item_count,
        ordered_date=body.ordered_date,
        expected_date=body.expected_date,
        amount=amount,
        status=body.status,
        raised_by=body.raised_by,
        notes=body.notes,
        created_at=date.today().isoformat(),
    )
    db.add(po)
    db.flush()

    for idx, li in enumerate(body.line_items):
        line = POLineItem(
            id=f"poli_{int(time.time() * 1000)}_{idx}",
            po_id=po.id,
            item_id=li.item_id,
            item_name=li.item_name,
            quantity_ordered=li.quantity_ordered,
            quantity_received=0,
            unit_price=li.unit_price,
        )
        db.add(line)

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


@router.post("/{po_id}/receive", response_model=PurchaseOrderOut)
def receive_order(po_id: str, body: ReceivePOBody, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Purchase order not found")

    for receive_line in body.lines:
        line = db.query(POLineItem).filter(POLineItem.id == receive_line.line_item_id).first()
        if not line or receive_line.quantity_received <= 0:
            continue

        line.quantity_received = receive_line.quantity_received

        # Update inventory stock
        if line.item_id:
            item = db.query(Item).filter(Item.id == line.item_id).first()
            if item:
                item.quantity = max(0, item.quantity + receive_line.quantity_received)
                item.available = max(0, item.quantity - item.reserved)
                item.status = _compute_status(item.quantity, item.min_quantity or 10)
                item.last_updated = date.today().isoformat()

        # Create stock transaction record
        tx = StockTransaction(
            id=f"tx_{int(time.time() * 1000)}_{line.id[-4:]}",
            organization_id=po.organization_id,
            date=date.today().isoformat(),
            item_id=line.item_id,
            item_name=line.item_name,
            type="received",
            quantity=receive_line.quantity_received,
            user="Store Manager",
            reference=po.po_number,
            notes=f"Received against {po.po_number}",
        )
        db.add(tx)

    db.flush()

    # Update PO status based on line item fulfillment
    all_lines = db.query(POLineItem).filter(POLineItem.po_id == po_id).all()
    if all_lines:
        all_received = all(l.quantity_received >= l.quantity_ordered for l in all_lines)
        any_received = any(l.quantity_received > 0 for l in all_lines)
        if all_received:
            po.status = "received"
        elif any_received:
            po.status = "partially_received"

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
