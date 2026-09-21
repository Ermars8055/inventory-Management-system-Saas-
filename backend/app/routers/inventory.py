import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Item, User
from ..schemas import ItemOut, ItemCreate, ItemUpdate, StockAdjust
from ..dependencies import require, same_org, check_limit
from ..audit import log_action
from .notifications import create_notification

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _compute_status(qty: int, min_qty: int = 10) -> str:
    if qty == 0:
        return "out_of_stock"
    if qty <= min_qty:
        return "low_stock"
    return "in_stock"


@router.get("", response_model=list[ItemOut])
def list_items(user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    return db.query(Item).filter(Item.organization_id == user.organization_id).all()


@router.post("", response_model=ItemOut, status_code=201)
def create_item(body: ItemCreate, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    check_limit("items", user, db)
    # Duplicate SKU check
    if body.sku:
        existing = db.query(Item).filter(Item.organization_id == user.organization_id, Item.sku == body.sku).first()
        if existing:
            raise HTTPException(409, f"An item with SKU '{body.sku}' already exists")
    avail = body.available if body.available is not None else body.quantity
    min_qty = body.min_quantity if body.min_quantity is not None else 10
    reorder_qty = body.reorder_qty if body.reorder_qty is not None else 50
    item = Item(
        id=f"item_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        name=body.name,
        sku=body.sku,
        category_id=body.category_id,
        category_name=body.category_name,
        module=body.module or "general",
        quantity=body.quantity,
        available=avail,
        reserved=body.reserved,
        min_quantity=min_qty,
        reorder_qty=reorder_qty,
        location=body.location,
        status=_compute_status(body.quantity, min_qty),
        last_updated=date.today().isoformat(),
        uniform=body.uniform,
        book=body.book,
        medicine=body.medicine,
        attributes=body.attributes,
    )
    db.add(item)
    log_action(db, user, "create", "item", item.id, f"Created item: {item.name}")
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=ItemOut)
def get_item(item_id: str, user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    same_org(item.organization_id, user)
    return item


@router.put("/{item_id}", response_model=ItemOut)
def update_item(item_id: str, body: ItemUpdate, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    same_org(item.organization_id, user)
    data = body.model_dump(exclude_none=True, by_alias=False)
    for field, value in data.items():
        setattr(item, field, value)
    if "quantity" in data:
        item.status = _compute_status(item.quantity, item.min_quantity or 10)
    if "min_quantity" in data and "quantity" not in data:
        item.status = _compute_status(item.quantity, item.min_quantity or 10)
    item.last_updated = date.today().isoformat()
    log_action(db, user, "update", "item", item.id, f"Updated item: {item.name}")
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}/stock", response_model=ItemOut)
def adjust_stock(item_id: str, body: StockAdjust, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    # Use with_for_update() to prevent race conditions on concurrent stock changes
    item = db.query(Item).filter(Item.id == item_id).with_for_update().first()
    if not item:
        raise HTTPException(404, "Item not found")
    same_org(item.organization_id, user)
    item.quantity = max(0, item.quantity + body.delta)
    item.available = max(0, item.quantity - item.reserved)
    item.status = _compute_status(item.quantity, item.min_quantity or 10)
    item.last_updated = date.today().isoformat()
    # Low stock notification
    if item.status in ("low_stock", "out_of_stock"):
        create_notification(db, user.organization_id, "low_stock",
            f"Low stock: {item.name}",
            f"{item.name} has {item.quantity} units left (min: {item.min_quantity or 10})")
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: str, user: User = Depends(require("inventory:delete")), db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    same_org(item.organization_id, user)
    log_action(db, user, "delete", "item", item.id, f"Deleted item: {item.name}")
    db.delete(item)
    db.commit()
