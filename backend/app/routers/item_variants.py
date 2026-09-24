"""
Item Variant Groups — product families with per-variant stock.
e.g. "Uniform Shirt" → Size 28, Size 30, Size 32, Size 34, Size 36

Each variant is a full Item row with its own stock, SKU, and status.
The group is a lightweight link — deleting a group unlinks variants without deleting them.
"""
import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ItemVariantGroup, Item, User, compute_item_status
from ..schemas import (
    ItemVariantGroupOut, ItemVariantGroupCreate, ItemVariantGroupUpdate,
    ItemOut, VariantItemCreate,
)
from ..dependencies import require, same_org
from ..audit import log_action

router = APIRouter(prefix="/item-variant-groups", tags=["item_variants"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _group_rollup(group: ItemVariantGroup, db: Session) -> dict:
    variants = db.query(Item).filter(Item.variant_group_id == group.id).all()
    total_qty = sum(v.quantity for v in variants)
    total_available = sum(v.available for v in variants)
    statuses = [v.status for v in variants]
    if "out_of_stock" in statuses:
        status = "out_of_stock"
    elif "low_stock" in statuses:
        status = "low_stock"
    else:
        status = "in_stock" if variants else "out_of_stock"
    return {
        "id": group.id,
        "organization_id": group.organization_id,
        "name": group.name,
        "description": group.description,
        "category_id": group.category_id,
        "created_at": group.created_at,
        "variant_count": len(variants),
        "total_qty": total_qty,
        "total_available": total_available,
        "status": status,
    }


def _make_variant_item(
    db: Session,
    group: ItemVariantGroup,
    org_id: str,
    v: VariantItemCreate,
    idx: int,
    ts: int,
) -> Item:
    existing = db.query(Item).filter(
        Item.organization_id == org_id,
        Item.sku == v.sku,
    ).first()
    if existing:
        raise HTTPException(409, f"SKU '{v.sku}' already exists")
    item = Item(
        id=f"item_{ts}_{idx}",
        organization_id=org_id,
        name=f"{group.name} – {v.label}",
        sku=v.sku,
        quantity=v.quantity,
        available=v.quantity,
        reserved=0,
        min_quantity=v.min_quantity,
        reorder_qty=v.reorder_qty,
        location=v.location,
        status=compute_item_status(v.quantity, v.min_quantity),
        last_updated=date.today().isoformat(),
        variant_group_id=group.id,
        variant_label=v.label,
    )
    return item


# ── List all groups ───────────────────────────────────────────────────────────

@router.get("", response_model=list[ItemVariantGroupOut])
def list_groups(
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db),
):
    groups = (
        db.query(ItemVariantGroup)
        .filter(ItemVariantGroup.organization_id == user.organization_id)
        .order_by(ItemVariantGroup.name)
        .all()
    )
    return [_group_rollup(g, db) for g in groups]


# ── Create group (+ optional initial variants) ────────────────────────────────

@router.post("", response_model=ItemVariantGroupOut, status_code=201)
def create_group(
    body: ItemVariantGroupCreate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db),
):
    # Duplicate group name check
    existing = db.query(ItemVariantGroup).filter(
        ItemVariantGroup.organization_id == user.organization_id,
        ItemVariantGroup.name == body.name,
    ).first()
    if existing:
        raise HTTPException(409, f"A variant group named '{body.name}' already exists")

    ts = int(time.time() * 1000)
    group = ItemVariantGroup(
        id=f"vg_{ts}",
        organization_id=user.organization_id,
        name=body.name,
        description=body.description,
        category_id=body.category_id,
        created_at=date.today().isoformat(),
    )
    db.add(group)
    db.flush()  # get group.id before creating variants

    created_items = []
    for idx, v in enumerate(body.variants):
        item = _make_variant_item(db, group, user.organization_id, v, idx, ts)
        db.add(item)
        created_items.append(item)

    log_action(
        db, user, "create", "variant_group", group.id,
        f"Created variant group: {body.name} with {len(body.variants)} variant(s)",
    )
    db.commit()
    db.refresh(group)
    return _group_rollup(group, db)


# ── Get group detail ──────────────────────────────────────────────────────────

@router.get("/{group_id}", response_model=ItemVariantGroupOut)
def get_group(
    group_id: str,
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db),
):
    group = db.query(ItemVariantGroup).filter(ItemVariantGroup.id == group_id).first()
    if not group:
        raise HTTPException(404, "Variant group not found")
    same_org(group.organization_id, user)
    return _group_rollup(group, db)


@router.get("/{group_id}/variants", response_model=list[ItemOut])
def list_group_variants(
    group_id: str,
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db),
):
    group = db.query(ItemVariantGroup).filter(ItemVariantGroup.id == group_id).first()
    if not group:
        raise HTTPException(404, "Variant group not found")
    same_org(group.organization_id, user)
    return db.query(Item).filter(Item.variant_group_id == group_id).all()


# ── Update group ──────────────────────────────────────────────────────────────

@router.put("/{group_id}", response_model=ItemVariantGroupOut)
def update_group(
    group_id: str,
    body: ItemVariantGroupUpdate,
    user: User = Depends(require("inventory:update")),
    db: Session = Depends(get_db),
):
    group = db.query(ItemVariantGroup).filter(ItemVariantGroup.id == group_id).first()
    if not group:
        raise HTTPException(404, "Variant group not found")
    same_org(group.organization_id, user)

    changes = body.model_dump(exclude_none=True)
    before = {k: getattr(group, k) for k in changes}

    # Duplicate name check when renaming
    if "name" in changes and changes["name"] != group.name:
        dup = db.query(ItemVariantGroup).filter(
            ItemVariantGroup.organization_id == user.organization_id,
            ItemVariantGroup.name == changes["name"],
            ItemVariantGroup.id != group_id,
        ).first()
        if dup:
            raise HTTPException(409, f"A variant group named '{changes['name']}' already exists")

    old_name = group.name
    for field, value in changes.items():
        setattr(group, field, value)

    # If name changed, rename all variant items accordingly
    if "name" in changes and changes["name"] != old_name:
        variants = db.query(Item).filter(Item.variant_group_id == group_id).all()
        for v in variants:
            if v.variant_label:
                v.name = f"{group.name} – {v.variant_label}"

    log_action(db, user, "update", "variant_group", group_id,
               f"Updated variant group: {group.name}", before=before, after=changes)
    db.commit()
    db.refresh(group)
    return _group_rollup(group, db)


# ── Delete group (unlinks variants, does NOT delete items) ────────────────────

@router.delete("/{group_id}", status_code=204)
def delete_group(
    group_id: str,
    user: User = Depends(require("inventory:delete")),
    db: Session = Depends(get_db),
):
    group = db.query(ItemVariantGroup).filter(ItemVariantGroup.id == group_id).first()
    if not group:
        raise HTTPException(404, "Variant group not found")
    same_org(group.organization_id, user)

    # Unlink all variants — they become standalone items
    variants = db.query(Item).filter(Item.variant_group_id == group_id).all()
    for v in variants:
        v.variant_group_id = None
        # Keep variant_label as item context

    log_action(db, user, "delete", "variant_group", group_id,
               f"Deleted variant group: {group.name} ({len(variants)} variants unlinked)")
    db.delete(group)
    db.commit()


# ── Add a new variant item to an existing group ───────────────────────────────

@router.post("/{group_id}/variants", response_model=ItemOut, status_code=201)
def add_variant(
    group_id: str,
    body: VariantItemCreate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db),
):
    group = db.query(ItemVariantGroup).filter(ItemVariantGroup.id == group_id).first()
    if not group:
        raise HTTPException(404, "Variant group not found")
    same_org(group.organization_id, user)

    ts = int(time.time() * 1000)
    item = _make_variant_item(db, group, user.organization_id, body, 0, ts)
    db.add(item)
    log_action(db, user, "add_variant", "variant_group", group_id,
               f"Added variant to '{group.name}': {body.label} (SKU: {body.sku})")
    db.commit()
    db.refresh(item)
    return item


# ── Unlink a variant from a group (does NOT delete the item) ─────────────────

@router.delete("/{group_id}/variants/{item_id}", status_code=204)
def remove_variant(
    group_id: str,
    item_id: str,
    user: User = Depends(require("inventory:update")),
    db: Session = Depends(get_db),
):
    group = db.query(ItemVariantGroup).filter(ItemVariantGroup.id == group_id).first()
    if not group:
        raise HTTPException(404, "Variant group not found")
    same_org(group.organization_id, user)

    item = db.query(Item).filter(
        Item.id == item_id,
        Item.variant_group_id == group_id,
    ).first()
    if not item:
        raise HTTPException(404, "Variant not found in this group")

    label = item.variant_label or item.name
    item.variant_group_id = None

    # Auto-delete empty group
    remaining = db.query(Item).filter(
        Item.variant_group_id == group_id,
        Item.id != item_id,
    ).count()
    if remaining == 0:
        log_action(db, user, "delete", "variant_group", group_id,
                   f"Auto-deleted empty variant group: {group.name}")
        db.delete(group)
    else:
        log_action(db, user, "remove_variant", "variant_group", group_id,
                   f"Removed variant from '{group.name}': {label} (item kept as standalone)")

    db.commit()
