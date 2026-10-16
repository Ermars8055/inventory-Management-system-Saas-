import re
import time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Warehouse, Location, Item, StockTransaction, User
from ..schemas import WarehouseOut, WarehouseCreate, WarehouseUpdate, WarehouseTransferCreate, ItemOut
from ..dependencies import require
from ..audit import log_action

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


def generate_warehouse_code(name: str, existing_codes: list[str]) -> str:
    """Acronym generator for warehouse code, e.g. Central Warehouse -> WH-01."""
    if not name or not name.strip():
        return "WH-01"

    tokens = [t for t in re.split(r"[\s\-_/,]+", re.sub(r"[^\w\s-]", " ", name.strip())) if t]
    stop_words = {"a", "an", "the", "and", "or", "of", "for", "in", "at", "to", "by", "on", "with", "from"}
    meaningful = [t for t in tokens if t.lower() not in stop_words]
    tokens = meaningful if meaningful else tokens

    abbrevs = {
        "warehouse": "WH", "central": "CW", "depot": "DPT", "store": "STR",
        "storage": "STR", "distribution": "DC", "hub": "HUB", "main": "MAIN",
        "north": "NRTH", "south": "STH", "east": "EAST", "west": "WEST",
        "facility": "FAC", "yard": "YRD", "supply": "SUP"
    }

    if not tokens:
        base = "WH"
    elif len(tokens) == 1:
        tok = tokens[0].lower()
        base = abbrevs.get(tok, tokens[0][:4].upper())
    elif len(tokens) == 2:
        tok1 = abbrevs.get(tokens[0].lower(), tokens[0][:2].upper())
        tok2 = abbrevs.get(tokens[1].lower(), tokens[1][:2].upper())
        base = f"{tok1}-{tok2}"
    else:
        base = "".join(t[0].upper() for t in tokens[:3])

    base = re.sub(r"[^A-Z0-9-]", "", base).strip("-")
    if not base:
        base = "WH"

    upper_existing = {c.upper().strip() for c in existing_codes if c}
    pattern = re.compile(rf"^{re.escape(base)}-(\d+)$")
    max_num = 0
    for code in upper_existing:
        m = pattern.match(code)
        if m:
            try:
                num = int(m.group(1))
                if num > max_num:
                    max_num = num
            except ValueError:
                pass

    next_num = max_num + 1
    candidate = f"{base}-{next_num:02d}"
    while candidate in upper_existing:
        next_num += 1
        candidate = f"{base}-{next_num:02d}"

    return candidate


@router.get("", response_model=list[WarehouseOut])
def list_warehouses(
    include_inactive: bool = False,
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db)
):
    query = db.query(Warehouse).filter(Warehouse.organization_id == user.organization_id)
    if not include_inactive:
        query = query.filter(Warehouse.is_active == True)
    warehouses = query.order_by(Warehouse.building, Warehouse.name).all()

    # If organization has zero warehouses, auto-create a default Central Warehouse
    if not warehouses and not include_inactive:
        default_wh = Warehouse(
            id=f"wh_{int(time.time() * 1000)}",
            organization_id=user.organization_id,
            name="Central Warehouse",
            code="WH-01",
            building="Main Campus Logistics Block",
            address="Building A, Central Logistics Hub",
            supervisor_name="Logistics Manager",
            supervisor_phone="+91 98765 00000",
            max_capacity=5000,
            is_active=True,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
        )
        db.add(default_wh)
        db.commit()
        db.refresh(default_wh)
        warehouses = [default_wh]

    # Aggregate item count and units per warehouse
    items = db.query(Item).filter(Item.organization_id == user.organization_id).all()
    wh_stats: dict[str, dict] = {}
    for it in items:
        # Match by warehouse_id or check if location points to this warehouse
        wh_key = it.warehouse_id
        if wh_key:
            if wh_key not in wh_stats:
                wh_stats[wh_key] = {"items": 0, "units": 0}
            wh_stats[wh_key]["items"] += 1
            wh_stats[wh_key]["units"] += (it.quantity or 0)

    result = []
    for wh in warehouses:
        stats = wh_stats.get(wh.id) or wh_stats.get(wh.name) or {"items": 0, "units": 0}
        total_items = stats["items"]
        total_units = stats["units"]
        cap = wh.max_capacity or 5000
        avail = max(0, cap - total_units)
        util_pct = round((total_units / cap) * 100, 1) if cap > 0 else 0.0

        out = WarehouseOut(
            id=wh.id,
            organization_id=wh.organization_id,
            name=wh.name,
            code=wh.code,
            building=wh.building,
            address=wh.address,
            supervisor_name=wh.supervisor_name,
            supervisor_phone=wh.supervisor_phone,
            max_capacity=cap,
            is_active=wh.is_active,
            created_at=wh.created_at,
            updated_at=wh.updated_at,
            total_items=total_items,
            total_units=total_units,
            available_capacity=avail,
            utilization_pct=util_pct,
        )
        result.append(out)

    return result


@router.post("", response_model=WarehouseOut, status_code=201)
def create_warehouse(
    body: WarehouseCreate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db)
):
    existing = db.query(Warehouse).filter(
        Warehouse.organization_id == user.organization_id,
        func.lower(Warehouse.name) == body.name.strip().lower()
    ).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.building = body.building or existing.building
            existing.address = body.address or existing.address
            existing.supervisor_name = body.supervisor_name or existing.supervisor_name
            existing.supervisor_phone = body.supervisor_phone or existing.supervisor_phone
            existing.max_capacity = body.max_capacity or existing.max_capacity
            existing.updated_at = datetime.now().isoformat()
            db.commit()
            db.refresh(existing)
            log_action(db, user, "update", "warehouse", existing.id, f"Reactivated warehouse {existing.name}")
            return WarehouseOut.model_validate(existing)
        raise HTTPException(409, f"A warehouse with name '{body.name}' already exists")

    wh_id = f"wh_{int(time.time() * 1000)}"
    now = datetime.now().isoformat()

    code = body.code.strip().upper() if body.code and body.code.strip() else None
    if not code:
        existing_codes = [
            c[0] for c in db.query(Warehouse.code)
            .filter(Warehouse.organization_id == user.organization_id, Warehouse.code.isnot(None))
            .all()
        ]
        code = generate_warehouse_code(body.name, existing_codes)

    wh = Warehouse(
        id=wh_id,
        organization_id=user.organization_id,
        name=body.name.strip(),
        code=code,
        building=body.building.strip() if body.building else "Main Logistics Depot",
        address=body.address.strip() if body.address else None,
        supervisor_name=body.supervisor_name.strip() if body.supervisor_name else None,
        supervisor_phone=body.supervisor_phone.strip() if body.supervisor_phone else None,
        max_capacity=body.max_capacity or 5000,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)

    log_action(db, user, "create", "warehouse", wh.id, f"Created warehouse depot {wh.name} ({wh.code})")

    return WarehouseOut(
        id=wh.id,
        organization_id=wh.organization_id,
        name=wh.name,
        code=wh.code,
        building=wh.building,
        address=wh.address,
        supervisor_name=wh.supervisor_name,
        supervisor_phone=wh.supervisor_phone,
        max_capacity=wh.max_capacity,
        is_active=wh.is_active,
        created_at=wh.created_at,
        updated_at=wh.updated_at,
        total_items=0,
        total_units=0,
        available_capacity=wh.max_capacity,
        utilization_pct=0.0,
    )


@router.put("/{wh_id}", response_model=WarehouseOut)
def update_warehouse(
    wh_id: str,
    body: WarehouseUpdate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db)
):
    wh = db.query(Warehouse).filter(
        Warehouse.id == wh_id,
        Warehouse.organization_id == user.organization_id
    ).first()
    if not wh:
        raise HTTPException(404, "Warehouse not found")

    if body.name and body.name.strip() != wh.name:
        existing = db.query(Warehouse).filter(
            Warehouse.organization_id == user.organization_id,
            Warehouse.id != wh_id,
            func.lower(Warehouse.name) == body.name.strip().lower()
        ).first()
        if existing:
            raise HTTPException(409, f"Another warehouse named '{body.name}' already exists")
        wh.name = body.name.strip()

    if body.code is not None:
        wh.code = body.code.strip().upper() if body.code else None
    if body.building is not None:
        wh.building = body.building.strip() if body.building else None
    if body.address is not None:
        wh.address = body.address.strip() if body.address else None
    if body.supervisor_name is not None:
        wh.supervisor_name = body.supervisor_name.strip() if body.supervisor_name else None
    if body.supervisor_phone is not None:
        wh.supervisor_phone = body.supervisor_phone.strip() if body.supervisor_phone else None
    if body.max_capacity is not None:
        wh.max_capacity = body.max_capacity
    if body.is_active is not None:
        wh.is_active = body.is_active

    wh.updated_at = datetime.now().isoformat()
    db.commit()
    db.refresh(wh)

    # Recalculate usage
    items = db.query(Item).filter(
        Item.organization_id == user.organization_id,
        (Item.warehouse_id == wh.id) | (Item.location == wh.name)
    ).all()
    total_units = sum(i.quantity or 0 for i in items)
    cap = wh.max_capacity or 5000

    log_action(db, user, "update", "warehouse", wh.id, f"Updated warehouse {wh.name}")

    return WarehouseOut(
        id=wh.id,
        organization_id=wh.organization_id,
        name=wh.name,
        code=wh.code,
        building=wh.building,
        address=wh.address,
        supervisor_name=wh.supervisor_name,
        supervisor_phone=wh.supervisor_phone,
        max_capacity=cap,
        is_active=wh.is_active,
        created_at=wh.created_at,
        updated_at=wh.updated_at,
        total_items=len(items),
        total_units=total_units,
        available_capacity=max(0, cap - total_units),
        utilization_pct=round((total_units / cap) * 100, 1) if cap > 0 else 0.0,
    )


@router.delete("/{wh_id}")
def delete_warehouse(
    wh_id: str,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db)
):
    wh = db.query(Warehouse).filter(
        Warehouse.id == wh_id,
        Warehouse.organization_id == user.organization_id
    ).first()
    if not wh:
        raise HTTPException(404, "Warehouse not found")

    items_count = db.query(Item).filter(
        Item.organization_id == user.organization_id,
        (Item.warehouse_id == wh.id) | (Item.location == wh.name),
        Item.quantity > 0
    ).count()

    if items_count > 0:
        raise HTTPException(
            400,
            f"Cannot delete warehouse '{wh.name}' because {items_count} items are currently held here. Please transfer or dispatch them first."
        )

    wh.is_active = False
    wh.updated_at = datetime.now().isoformat()
    db.commit()

    log_action(db, user, "delete", "warehouse", wh.id, f"Archived warehouse depot {wh.name}")
    return {"message": f"Warehouse '{wh.name}' has been archived"}


@router.get("/{wh_id}/items", response_model=list[ItemOut])
def get_warehouse_items(
    wh_id: str,
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db)
):
    wh = db.query(Warehouse).filter(
        Warehouse.id == wh_id,
        Warehouse.organization_id == user.organization_id
    ).first()
    if not wh:
        raise HTTPException(404, "Warehouse not found")

    items = db.query(Item).filter(
        Item.organization_id == user.organization_id,
        (Item.warehouse_id == wh.id) | (Item.location == wh.name)
    ).order_by(Item.name).all()

    return items


@router.post("/transfer")
def transfer_warehouse_stock(
    body: WarehouseTransferCreate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(
        Item.id == body.item_id,
        Item.organization_id == user.organization_id
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")

    if body.quantity <= 0:
        raise HTTPException(400, "Transfer quantity must be greater than 0")

    if body.quantity > item.quantity:
        raise HTTPException(400, f"Cannot transfer {body.quantity} units; only {item.quantity} available in current stock.")

    now = datetime.now().isoformat()
    today_str = now[:10]

    # Destination can be another Warehouse OR a physical Location (dispatch to place)
    dest_name = ""
    if body.to_warehouse_id:
        target_wh = db.query(Warehouse).filter(
            Warehouse.id == body.to_warehouse_id,
            Warehouse.organization_id == user.organization_id
        ).first()
        if not target_wh:
            raise HTTPException(404, "Target warehouse not found")
        dest_name = target_wh.name

        # Check capacity
        target_units = db.query(func.sum(Item.quantity)).filter(
            Item.organization_id == user.organization_id,
            Item.warehouse_id == target_wh.id
        ).scalar() or 0
        if (target_units + body.quantity) > target_wh.max_capacity:
            # allow with audit log
            pass

        if body.quantity == item.quantity:
            item.warehouse_id = target_wh.id
            item.location = target_wh.name
            item.last_updated = today_str
        else:
            item.quantity -= body.quantity
            item.available = max(0, item.available - body.quantity)
            item.last_updated = today_str
            # Add to destination warehouse
            dest_item = db.query(Item).filter(
                Item.organization_id == user.organization_id,
                Item.sku == item.sku,
                Item.warehouse_id == target_wh.id
            ).first()
            if dest_item:
                dest_item.quantity += body.quantity
                dest_item.available += body.quantity
                dest_item.last_updated = today_str
            else:
                new_item = Item(
                    id=f"item_{int(time.time() * 1000)}",
                    organization_id=user.organization_id,
                    name=item.name,
                    sku=f"{item.sku}-{target_wh.code or 'W'}",
                    category_id=item.category_id,
                    category_name=item.category_name,
                    module=item.module,
                    quantity=body.quantity,
                    available=body.quantity,
                    reserved=0,
                    location=target_wh.name,
                    warehouse_id=target_wh.id,
                    min_quantity=item.min_quantity,
                    reorder_qty=item.reorder_qty,
                    uniform=item.uniform,
                    book=item.book,
                    medicine=item.medicine,
                    attributes=item.attributes,
                    variant_group_id=item.variant_group_id,
                    variant_label=item.variant_label,
                    last_updated=today_str,
                )
                db.add(new_item)

    elif body.to_location_id:
        target_loc = db.query(Location).filter(
            (Location.id == body.to_location_id) | (Location.name == body.to_location_id),
            Location.organization_id == user.organization_id
        ).first()
        if not target_loc:
            raise HTTPException(404, "Target location / place not found")
        dest_name = target_loc.name

        if body.quantity == item.quantity:
            item.location_id = target_loc.id
            item.location = target_loc.name
            item.warehouse_id = None
            item.last_updated = today_str
        else:
            item.quantity -= body.quantity
            item.available = max(0, item.available - body.quantity)
            item.last_updated = today_str
            dest_item = db.query(Item).filter(
                Item.organization_id == user.organization_id,
                Item.sku == item.sku,
                (Item.location_id == target_loc.id) | (Item.location == target_loc.name)
            ).first()
            if dest_item:
                dest_item.quantity += body.quantity
                dest_item.available += body.quantity
                dest_item.last_updated = today_str
            else:
                new_item = Item(
                    id=f"item_{int(time.time() * 1000)}",
                    organization_id=user.organization_id,
                    name=item.name,
                    sku=f"{item.sku}-{target_loc.code or 'L'}",
                    category_id=item.category_id,
                    category_name=item.category_name,
                    module=item.module,
                    quantity=body.quantity,
                    available=body.quantity,
                    reserved=0,
                    location=target_loc.name,
                    location_id=target_loc.id,
                    warehouse_id=None,
                    min_quantity=item.min_quantity,
                    reorder_qty=item.reorder_qty,
                    uniform=item.uniform,
                    book=item.book,
                    medicine=item.medicine,
                    attributes=item.attributes,
                    variant_group_id=item.variant_group_id,
                    variant_label=item.variant_label,
                    last_updated=today_str,
                )
                db.add(new_item)
    else:
        raise HTTPException(400, "Please provide either to_warehouse_id or to_location_id")

    # Record stock transaction
    tx = StockTransaction(
        id=f"tx_{int(time.time() * 1000)}_wh_out",
        organization_id=user.organization_id,
        date=now,
        item_id=item.id,
        item_name=item.name,
        type="adjusted",
        quantity=-body.quantity,
        reference=f"Dispatched to {dest_name}",
        recipient=dest_name,
        user=user.name,
    )
    db.add(tx)

    log_action(
        db,
        user,
        "transfer",
        "warehouse",
        body.from_warehouse_id or "inventory",
        f"Transferred {body.quantity} units of {item.name} to {dest_name}. Notes: {body.notes or 'None'}"
    )

    db.commit()
    return {
        "success": True,
        "message": f"Successfully moved {body.quantity} units of '{item.name}' to '{dest_name}'",
        "transferredUnits": body.quantity,
        "destination": dest_name,
    }
