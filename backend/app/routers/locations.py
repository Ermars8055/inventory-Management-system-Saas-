import re
import time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Location, Item, StockTransaction, User
from ..schemas import LocationOut, LocationCreate, LocationUpdate, StockTransferCreate, LocationRecommendation, ItemOut
from ..dependencies import require, same_org
from ..audit import log_action

router = APIRouter(prefix="/locations", tags=["locations"])


def generate_location_code(name: str, existing_codes: list[str]) -> str:
    """Smart Name Acronym + Number generator for location code."""
    if not name or not name.strip():
        return "LOC-01"

    tokens = [t for t in re.split(r"[\s\-_/,]+", re.sub(r"[^\w\s-]", " ", name.strip())) if t]
    stop_words = {"a", "an", "the", "and", "or", "of", "for", "in", "at", "to", "by", "on", "with", "from"}
    meaningful = [t for t in tokens if t.lower() not in stop_words]
    tokens = meaningful if meaningful else tokens

    abbrevs = {
        "laboratory": "LAB", "lab": "LAB", "store": "STR", "storeroom": "STR", "storage": "STR",
        "warehouse": "WH", "room": "RM", "shelf": "SHF", "rack": "RCK", "library": "LIB",
        "office": "OFC", "cabinet": "CAB", "chemistry": "CHEM", "physics": "PHY",
        "biology": "BIO", "computer": "COMP", "medical": "MED", "medicine": "MED",
        "pharmacy": "PHAR", "reception": "RCP", "auditorium": "AUD", "block": "BLK",
        "wing": "WNG", "hall": "HLL", "center": "CTR", "department": "DEPT"
    }

    def fmt_tok(t: str) -> str:
        low = t.lower()
        if low in abbrevs:
            return abbrevs[low]
        return t.upper() if len(t) <= 4 else t[:4].upper()

    if not tokens:
        base = "LOC"
    elif len(tokens) == 1:
        base = fmt_tok(tokens[0])
    elif len(tokens) == 2:
        base = f"{fmt_tok(tokens[0])}-{fmt_tok(tokens[1])}"
    else:
        last = tokens[-1]
        if any(c.isdigit() for c in last) or len(last) <= 3:
            prior = "".join(abbrevs.get(t.lower(), t)[0].upper() for t in tokens[:-1])
            base = f"{prior}-{last.upper()}"
        else:
            base = "".join(t[0].upper() for t in tokens)

    base = re.sub(r"[^A-Z0-9-]", "", base).strip("-")
    if not base:
        base = "LOC"

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


@router.get("", response_model=list[LocationOut])
def list_locations(
    include_inactive: bool = False,
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db)
):
    query = db.query(Location).filter(Location.organization_id == user.organization_id)
    if not include_inactive:
        query = query.filter(Location.is_active == True)
    locations = query.order_by(Location.building, Location.floor, Location.name).all()

    # Aggregate item count and units per location
    items = db.query(Item).filter(Item.organization_id == user.organization_id).all()
    loc_stats: dict[str, dict] = {}
    for it in items:
        loc_key = it.location_id or it.location
        if loc_key:
            if loc_key not in loc_stats:
                loc_stats[loc_key] = {"items": 0, "units": 0}
            loc_stats[loc_key]["items"] += 1
            loc_stats[loc_key]["units"] += (it.quantity or 0)

    result = []
    for loc in locations:
        stats = loc_stats.get(loc.id) or loc_stats.get(loc.name) or {"items": 0, "units": 0}
        total_items = stats["items"]
        total_units = stats["units"]
        cap = loc.max_capacity
        avail = max(0, cap - total_units) if cap is not None else None
        util_pct = round((total_units / cap) * 100, 1) if cap and cap > 0 else None

        out = LocationOut(
            id=loc.id,
            organization_id=loc.organization_id,
            name=loc.name,
            code=loc.code,
            building=loc.building,
            floor=loc.floor,
            type=loc.type or "classroom",
            supervisor_name=loc.supervisor_name,
            supervisor_phone=loc.supervisor_phone,
            max_capacity=cap,
            is_active=loc.is_active,
            created_at=loc.created_at,
            updated_at=loc.updated_at,
            total_items=total_items,
            total_units=total_units,
            available_capacity=avail,
            utilization_pct=util_pct,
        )
        result.append(out)

    return result


@router.post("", response_model=LocationOut, status_code=201)
def create_location(
    body: LocationCreate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db)
):
    existing = db.query(Location).filter(
        Location.organization_id == user.organization_id,
        func.lower(Location.name) == body.name.strip().lower()
    ).first()
    if existing:
        if not existing.is_active:
            # Reactivate if previously archived
            existing.is_active = True
            existing.building = body.building or existing.building
            existing.floor = body.floor or existing.floor
            existing.type = body.type or existing.type
            existing.max_capacity = body.max_capacity or existing.max_capacity
            existing.supervisor_name = body.supervisor_name or existing.supervisor_name
            existing.supervisor_phone = body.supervisor_phone or existing.supervisor_phone
            existing.updated_at = datetime.now().isoformat()
            db.commit()
            db.refresh(existing)
            log_action(db, user, "update", "location", existing.id, f"Reactivated place {existing.name}")
            return LocationOut.model_validate(existing)
        raise HTTPException(409, f"A location with name '{body.name}' already exists")

    loc_id = f"loc_{int(time.time() * 1000)}"
    now = datetime.now().isoformat()
    
    code = body.code.strip().upper() if body.code and body.code.strip() else None
    if not code:
        existing_codes = [
            c[0] for c in db.query(Location.code)
            .filter(Location.organization_id == user.organization_id, Location.code.isnot(None))
            .all()
        ]
        code = generate_location_code(body.name, existing_codes)

    loc = Location(
        id=loc_id,
        organization_id=user.organization_id,
        name=body.name.strip(),
        code=code,
        building=body.building.strip() if body.building else "Main Building",
        floor=body.floor.strip() if body.floor else None,
        type=body.type or "classroom",
        supervisor_name=body.supervisor_name.strip() if body.supervisor_name else None,
        supervisor_phone=body.supervisor_phone.strip() if body.supervisor_phone else None,
        max_capacity=body.max_capacity,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)

    log_action(db, user, "create", "location", loc.id, f"Created place {loc.name} ({loc.building or 'Main Campus'})")

    return LocationOut(
        id=loc.id,
        organization_id=loc.organization_id,
        name=loc.name,
        code=loc.code,
        building=loc.building,
        floor=loc.floor,
        type=loc.type,
        supervisor_name=loc.supervisor_name,
        supervisor_phone=loc.supervisor_phone,
        max_capacity=loc.max_capacity,
        is_active=loc.is_active,
        created_at=loc.created_at,
        updated_at=loc.updated_at,
        total_items=0,
        total_units=0,
        available_capacity=loc.max_capacity,
        utilization_pct=0.0 if loc.max_capacity else None,
    )


@router.put("/{loc_id}", response_model=LocationOut)
def update_location(
    loc_id: str,
    body: LocationUpdate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db)
):
    loc = db.query(Location).filter(
        Location.id == loc_id,
        Location.organization_id == user.organization_id
    ).first()
    if not loc:
        raise HTTPException(404, "Location not found")

    old_name = loc.name
    if body.name and body.name.strip() != old_name:
        # Check duplicate name
        existing = db.query(Location).filter(
            Location.organization_id == user.organization_id,
            Location.id != loc_id,
            func.lower(Location.name) == body.name.strip().lower()
        ).first()
        if existing:
            raise HTTPException(409, f"Another location named '{body.name}' already exists")
        loc.name = body.name.strip()
        # Cascade name change to items that use this location
        db.query(Item).filter(
            Item.organization_id == user.organization_id,
            (Item.location_id == loc.id) | (Item.location == old_name)
        ).update({"location": loc.name, "location_id": loc.id}, synchronize_session=False)

    if body.code is not None:
        loc.code = body.code.strip().upper() if body.code else None
    if body.building is not None:
        loc.building = body.building.strip() if body.building else None
    if body.floor is not None:
        loc.floor = body.floor.strip() if body.floor else None
    if body.type is not None:
        loc.type = body.type
    if body.supervisor_name is not None:
        loc.supervisor_name = body.supervisor_name.strip() if body.supervisor_name else None
    if body.supervisor_phone is not None:
        loc.supervisor_phone = body.supervisor_phone.strip() if body.supervisor_phone else None
    if body.max_capacity is not None:
        loc.max_capacity = body.max_capacity
    if body.is_active is not None:
        loc.is_active = body.is_active

    loc.updated_at = datetime.now().isoformat()
    db.commit()
    db.refresh(loc)

    # Re-calculate usage
    items = db.query(Item).filter(
        Item.organization_id == user.organization_id,
        (Item.location_id == loc.id) | (Item.location == loc.name)
    ).all()
    total_units = sum(i.quantity or 0 for i in items)
    cap = loc.max_capacity
    avail = max(0, cap - total_units) if cap is not None else None
    util_pct = round((total_units / cap) * 100, 1) if cap and cap > 0 else None

    log_action(db, user, "update", "location", loc.id, f"Updated location {loc.name}")

    return LocationOut(
        id=loc.id,
        organization_id=loc.organization_id,
        name=loc.name,
        code=loc.code,
        building=loc.building,
        floor=loc.floor,
        type=loc.type,
        supervisor_name=loc.supervisor_name,
        supervisor_phone=loc.supervisor_phone,
        max_capacity=cap,
        is_active=loc.is_active,
        created_at=loc.created_at,
        updated_at=loc.updated_at,
        total_items=len(items),
        total_units=total_units,
        available_capacity=avail,
        utilization_pct=util_pct,
    )


@router.delete("/{loc_id}")
def delete_location(
    loc_id: str,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db)
):
    loc = db.query(Location).filter(
        Location.id == loc_id,
        Location.organization_id == user.organization_id
    ).first()
    if not loc:
        raise HTTPException(404, "Location not found")

    # Check if items currently reside here
    items_count = db.query(Item).filter(
        Item.organization_id == user.organization_id,
        (Item.location_id == loc.id) | (Item.location == loc.name),
        Item.quantity > 0
    ).count()

    if items_count > 0:
        raise HTTPException(
            400,
            f"Cannot delete location '{loc.name}' because {items_count} items are currently stored here. Please transfer them to another location first."
        )

    # Soft delete
    loc.is_active = False
    loc.updated_at = datetime.now().isoformat()
    db.commit()

    log_action(db, user, "delete", "location", loc.id, f"Archived location {loc.name}")
    return {"message": f"Location '{loc.name}' has been archived"}


@router.get("/{loc_id}/items", response_model=list[ItemOut])
def get_location_items(
    loc_id: str,
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db)
):
    loc = db.query(Location).filter(
        Location.id == loc_id,
        Location.organization_id == user.organization_id
    ).first()
    if not loc:
        raise HTTPException(404, "Location not found")

    items = db.query(Item).filter(
        Item.organization_id == user.organization_id,
        (Item.location_id == loc.id) | (Item.location == loc.name)
    ).order_by(Item.name).all()

    return items


@router.post("/transfer")
def transfer_stock(
    body: StockTransferCreate,
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
        raise HTTPException(400, f"Cannot transfer {body.quantity} units; only {item.quantity} available in current location.")

    to_loc = db.query(Location).filter(
        Location.organization_id == user.organization_id,
        (Location.name == body.to_location) | (Location.id == body.to_location)
    ).first()
    if not to_loc:
        raise HTTPException(404, f"Target location '{body.to_location}' not found")

    now = datetime.now().isoformat()
    today_str = now[:10]

    # Check capacity warning if configured
    if to_loc.max_capacity:
        to_loc_units = db.query(func.sum(Item.quantity)).filter(
            Item.organization_id == user.organization_id,
            (Item.location_id == to_loc.id) | (Item.location == to_loc.name)
        ).scalar() or 0
        if (to_loc_units + body.quantity) > to_loc.max_capacity:
            pass

    if body.quantity == item.quantity:
        # Full move — update item's location directly
        old_loc = item.location
        item.location = to_loc.name
        item.location_id = to_loc.id
        item.last_updated = today_str
    else:
        # Partial move — split quantity
        item.quantity -= body.quantity
        item.available = max(0, item.available - body.quantity)
        item.last_updated = today_str

        # Check if an identical item/variant exists at the destination location
        dest_item = db.query(Item).filter(
            Item.organization_id == user.organization_id,
            Item.sku == item.sku,
            (Item.location_id == to_loc.id) | (Item.location == to_loc.name)
        ).first()

        if dest_item:
            dest_item.quantity += body.quantity
            dest_item.available += body.quantity
            dest_item.last_updated = today_str
        else:
            # Create new item slice at destination
            new_item_id = f"item_{int(time.time() * 1000)}"
            new_item = Item(
                id=new_item_id,
                organization_id=user.organization_id,
                name=item.name,
                sku=f"{item.sku}-{to_loc.code or 'T'}",
                category_id=item.category_id,
                category_name=item.category_name,
                module=item.module,
                quantity=body.quantity,
                available=body.quantity,
                reserved=0,
                location=to_loc.name,
                location_id=to_loc.id,
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

    # Record stock transaction for audit tracking
    tx_out = StockTransaction(
        id=f"tx_{int(time.time() * 1000)}_out",
        organization_id=user.organization_id,
        date=now,
        item_id=item.id,
        item_name=item.name,
        type="adjusted",
        quantity=-body.quantity,
        reference=f"Transfer to {to_loc.name}",
        recipient=to_loc.name,
        user=user.name,
    )
    db.add(tx_out)

    log_action(
        db,
        user,
        "transfer",
        "location",
        to_loc.id,
        f"Transferred {body.quantity} units of {item.name} from {body.from_location} to {to_loc.name}. Notes: {body.notes or 'None'}"
    )

    db.commit()
    return {
        "success": True,
        "message": f"Successfully moved {body.quantity} units of '{item.name}' to '{to_loc.name}'",
        "transferredUnits": body.quantity,
        "fromLocation": body.from_location,
        "toLocation": to_loc.name,
    }


@router.get("/recommend", response_model=list[LocationRecommendation])
def recommend_locations(
    category_id: Optional[str] = None,
    category_name: Optional[str] = None,
    module: Optional[str] = None,
    quantity: int = Query(default=1, ge=1),
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db)
):
    locations = db.query(Location).filter(
        Location.organization_id == user.organization_id,
        Location.is_active == True
    ).all()

    items = db.query(Item).filter(Item.organization_id == user.organization_id).all()

    # Calculate current usage and category affinity per location
    loc_units: dict[str, int] = {}
    loc_cat_affinity: dict[str, int] = {}

    target_cat = (category_name or "").strip().lower()

    for it in items:
        lid = it.location_id or it.location
        if not lid:
            continue
        loc_units[lid] = loc_units.get(lid, 0) + (it.quantity or 0)

        # Check affinity
        it_cat = (it.category_name or "").strip().lower()
        if (category_id and it.category_id == category_id) or (target_cat and it_cat == target_cat):
            loc_cat_affinity[lid] = loc_cat_affinity.get(lid, 0) + 1

    recommendations = []
    for loc in locations:
        units = loc_units.get(loc.id) or loc_units.get(loc.name) or 0
        cap = loc.max_capacity
        avail = max(0, cap - units) if cap is not None else None
        affinity = loc_cat_affinity.get(loc.id) or loc_cat_affinity.get(loc.name) or 0

        # Score calculation based on location appropriateness
        score = 0
        reason = None

        if affinity > 0:
            score += 50 + (affinity * 5)
            reason = f"Primary place for {category_name or 'these'} items (holds {affinity} existing items)"
        elif avail is not None and avail >= quantity:
            score += 20
            reason = f"Designated space available"
        else:
            score += 10

        # Check room type affinity for modules
        ltype = (loc.type or "").lower()
        lname = loc.name.lower()
        if module == "uniforms" and (ltype in ("store_room", "wardrobe") or "store" in lname or "wardrobe" in lname):
            score += 35
            reason = "Designated apparel & uniform room"
        elif module in ("science", "lab") and (ltype in ("lab", "laboratory") or "lab" in lname):
            score += 40
            reason = "Designated science laboratory"
        elif module == "books" and (ltype in ("library", "classroom") or "lib" in lname or "book" in lname):
            score += 40
            reason = "Library & study room"
        elif module == "pharmacy" and (ltype in ("clinic", "infirmary", "medical") or "clinic" in lname or "medical" in lname):
            score += 40
            reason = "Clinic / Infirmary medicine cabinet"

        recommendations.append({
            "loc": loc,
            "score": score,
            "units": units,
            "cap": cap,
            "avail": avail,
            "reason": reason,
        })

    # Sort descending by score
    recommendations.sort(key=lambda x: x["score"], reverse=True)

    result = []
    for idx, item in enumerate(recommendations):
        loc = item["loc"]
        is_rec = idx < 3 and item["score"] > 0
        rec = LocationRecommendation(
            id=loc.id,
            name=loc.name,
            building=loc.building,
            type=loc.type or "classroom",
            current_units=item["units"],
            max_capacity=item["cap"],
            available_capacity=item["avail"],
            is_recommended=is_rec,
            recommendation_reason=item["reason"] if is_rec else None,
        )
        result.append(rec)

    return result
