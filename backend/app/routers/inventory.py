import re
import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Item, ItemVariantGroup, Organization, User, compute_item_status
from ..schemas import ItemOut, ItemCreate, ItemUpdate, StockAdjust
from ..dependencies import require, same_org, check_limit
from ..audit import log_action
from .notifications import create_notification

router = APIRouter(prefix="/inventory", tags=["inventory"])



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
    # Resolve variant group
    variant_group_id = body.variant_group_id
    if body.variant_group_name and not variant_group_id:
        # Create a new variant group on the fly
        ts = int(time.time() * 1000)
        group = ItemVariantGroup(
            id=f"vg_{ts}",
            organization_id=user.organization_id,
            name=body.variant_group_name,
            created_at=date.today().isoformat(),
        )
        db.add(group)
        db.flush()
        variant_group_id = group.id

    if variant_group_id and not body.variant_label:
        raise HTTPException(422, "variant_label is required when assigning a variant group")

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
        status=compute_item_status(body.quantity, min_qty),
        last_updated=date.today().isoformat(),
        uniform=body.uniform,
        book=body.book,
        medicine=body.medicine,
        attributes=body.attributes,
        variant_group_id=variant_group_id,
        variant_label=body.variant_label,
    )
    db.add(item)
    log_action(db, user, "create", "item", item.id, f"Created item: {item.name}")
    db.commit()
    db.refresh(item)
    return item


@router.get("/grouped")
def list_grouped(
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db),
):
    """
    Returns inventory in grouped form:
    [
      { "type": "group",      "group": {...rollup}, "variants": [...items] },
      { "type": "standalone", "item": {...} },
    ]
    Groups are sorted by name; standalone items sorted by name too.
    """
    items = db.query(Item).filter(Item.organization_id == user.organization_id).all()
    groups = (
        db.query(ItemVariantGroup)
        .filter(ItemVariantGroup.organization_id == user.organization_id)
        .order_by(ItemVariantGroup.name)
        .all()
    )

    # Build a lookup: group_id → variants
    from collections import defaultdict
    grouped_map: dict = defaultdict(list)
    standalone = []
    for item in items:
        if item.variant_group_id:
            grouped_map[item.variant_group_id].append(item)
        else:
            standalone.append(item)

    result = []
    for group in groups:
        variants = grouped_map.get(group.id, [])
        total_qty = sum(v.quantity for v in variants)
        total_available = sum(v.available for v in variants)
        statuses = [v.status for v in variants]
        if "out_of_stock" in statuses:
            rollup_status = "out_of_stock"
        elif "low_stock" in statuses:
            rollup_status = "low_stock"
        else:
            rollup_status = "in_stock" if variants else "out_of_stock"
        result.append({
            "type": "group",
            "group": {
                "id": group.id,
                "organizationId": group.organization_id,
                "name": group.name,
                "description": group.description,
                "categoryId": group.category_id,
                "createdAt": group.created_at,
                "variantCount": len(variants),
                "totalQty": total_qty,
                "totalAvailable": total_available,
                "status": rollup_status,
            },
            "variants": [
                {
                    "id": v.id,
                    "organizationId": v.organization_id,
                    "name": v.name,
                    "sku": v.sku,
                    "categoryId": v.category_id or "",
                    "categoryName": v.category_name or "",
                    "module": v.module or "general",
                    "quantity": v.quantity,
                    "available": v.available,
                    "reserved": v.reserved,
                    "minQuantity": v.min_quantity,
                    "reorderQty": v.reorder_qty,
                    "location": v.location or "",
                    "status": v.status,
                    "lastUpdated": v.last_updated,
                    "variantGroupId": v.variant_group_id,
                    "variantLabel": v.variant_label,
                }
                for v in variants
            ],
        })

    # Standalone items sorted by name
    standalone.sort(key=lambda i: i.name.lower())
    for item in standalone:
        result.append({
            "type": "standalone",
            "item": {
                "id": item.id,
                "organizationId": item.organization_id,
                "name": item.name,
                "sku": item.sku,
                "categoryId": item.category_id or "",
                "categoryName": item.category_name or "",
                "module": item.module or "general",
                "quantity": item.quantity,
                "available": item.available,
                "reserved": item.reserved,
                "minQuantity": item.min_quantity,
                "reorderQty": item.reorder_qty,
                "location": item.location or "",
                "status": item.status,
                "lastUpdated": item.last_updated,
                "variantGroupId": item.variant_group_id,
                "variantLabel": item.variant_label,
            },
        })

    return result


@router.get("/next-sku")
def next_sku(
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db),
):
    """Return the next available sequential SKU for this org: ORG-YEAR-NNN."""
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    raw_name = org.name if org else "ORG"
    org_prefix = re.sub(r"[^A-Z0-9]", "", raw_name.upper())[:4] or "ORG"
    year = date.today().year
    prefix_pattern = f"{org_prefix}-{year}-"

    # Find highest sequence already used this year
    rows = (
        db.query(Item.sku)
        .filter(
            Item.organization_id == user.organization_id,
            Item.sku.like(f"{prefix_pattern}%"),
        )
        .all()
    )
    max_seq = 0
    for (sku,) in rows:
        suffix = sku[len(prefix_pattern):]
        m = re.match(r"^(\d+)", suffix)
        if m:
            max_seq = max(max_seq, int(m.group(1)))

    next_seq = max_seq + 1
    return {"sku": f"{org_prefix}-{year}-{str(next_seq).zfill(3)}"}


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
    before = {k: getattr(item, k) for k in data}
    for field, value in data.items():
        setattr(item, field, value)
    if "quantity" in data:
        item.status = compute_item_status(item.quantity, item.min_quantity or 10)
    if "min_quantity" in data and "quantity" not in data:
        item.status = compute_item_status(item.quantity, item.min_quantity or 10)
    item.last_updated = date.today().isoformat()
    log_action(db, user, "update", "item", item.id, f"Updated item: {item.name}",
               before=before, after=data)
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
    old_available = item.available
    old_quantity = item.quantity
    item.quantity = max(0, item.quantity + body.delta)
    item.available = max(0, item.available + body.delta)
    item.status = compute_item_status(item.available, item.min_quantity or 10)
    item.last_updated = date.today().isoformat()
    # Low stock notification
    if item.status in ("low_stock", "out_of_stock"):
        create_notification(db, user.organization_id, "low_stock",
            f"Low stock: {item.name}",
            f"{item.name} has {item.quantity} units left (min: {item.min_quantity or 10})")
    direction = "+" if body.delta >= 0 else ""
    log_action(db, user, "stock_adjust", "item", item.id,
               f"Stock adjusted: {item.name} {direction}{body.delta}",
               before={"quantity": old_quantity, "available": old_available},
               after={"quantity": item.quantity, "available": item.available})
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
