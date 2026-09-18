"""
CSV Export & Import — bulk data operations for inventory, vendors, recipients, transactions.
"""
import io
import csv
import time
from datetime import date
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Item, Vendor, Recipient, StockTransaction, Category, User
from ..dependencies import require, check_limit

router = APIRouter(prefix="/data", tags=["data-io"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    if not rows:
        output = io.StringIO()
        output.write("No data")
        output.seek(0)
        return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


def _parse_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return [row for row in reader]


# ─── EXPORT ──────────────────────────────────────────────────────────────────

@router.get("/export/inventory")
def export_inventory(user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    items = db.query(Item).filter(Item.organization_id == user.organization_id).all()
    rows = [
        {"name": i.name, "sku": i.sku, "category": i.category_name or "", "quantity": i.quantity,
         "available": i.available, "reserved": i.reserved, "location": i.location or "",
         "status": i.status, "min_quantity": i.min_quantity or 10, "reorder_qty": i.reorder_qty or 50}
        for i in items
    ]
    return _csv_response(rows, "inventory.csv")


@router.get("/export/vendors")
def export_vendors(user: User = Depends(require("vendors:read")), db: Session = Depends(get_db)):
    vendors = db.query(Vendor).filter(Vendor.organization_id == user.organization_id).all()
    rows = [
        {"name": v.name, "contact_person": v.contact_person or "", "phone": v.phone or "",
         "email": v.email or "", "address": v.address or "", "vendor_type": v.vendor_type or "",
         "status": v.status or "active"}
        for v in vendors
    ]
    return _csv_response(rows, "vendors.csv")


@router.get("/export/recipients")
def export_recipients(user: User = Depends(require("recipients:read")), db: Session = Depends(get_db)):
    recipients = db.query(Recipient).filter(Recipient.organization_id == user.organization_id).all()
    rows = [
        {"name": r.name, "identifier": r.identifier or "", "group": r.group or "",
         "contact": r.contact or ""}
        for r in recipients
    ]
    return _csv_response(rows, "recipients.csv")


@router.get("/export/transactions")
def export_transactions(user: User = Depends(require("transactions:read")), db: Session = Depends(get_db)):
    txs = db.query(StockTransaction).filter(StockTransaction.organization_id == user.organization_id).order_by(StockTransaction.date.desc()).all()
    rows = [
        {"date": t.date, "item": t.item_name or "", "type": t.type, "quantity": t.quantity,
         "user": t.user or "", "reference": t.reference or "", "recipient": t.recipient or ""}
        for t in txs
    ]
    return _csv_response(rows, "transactions.csv")


# ─── IMPORT ──────────────────────────────────────────────────────────────────

@router.post("/import/inventory")
async def import_inventory(file: UploadFile = File(...), user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    content = await file.read()
    rows = _parse_csv(content)
    if not rows:
        raise HTTPException(400, "Empty or invalid CSV")

    # Get or create categories
    existing_cats = {c.name.lower(): c for c in db.query(Category).filter(Category.organization_id == user.organization_id).all()}

    created = 0
    ts = int(time.time() * 1000)
    for row in rows:
        name = row.get("name", "").strip()
        if not name:
            continue

        check_limit("items", user, db)

        cat_name = row.get("category", "").strip()
        cat_id = None
        if cat_name:
            cat_lower = cat_name.lower()
            if cat_lower not in existing_cats:
                new_cat = Category(id=f"cat_{ts}_{created}", organization_id=user.organization_id, name=cat_name)
                db.add(new_cat)
                db.flush()
                existing_cats[cat_lower] = new_cat
            cat_id = existing_cats[cat_lower].id

        qty = int(row.get("quantity", 0) or 0)
        min_qty = int(row.get("min_quantity", 10) or 10)

        item = Item(
            id=f"item_{ts}_{created}",
            organization_id=user.organization_id,
            name=name,
            sku=row.get("sku", f"SKU-{ts}-{created}").strip(),
            category_id=cat_id,
            category_name=cat_name,
            module="general",
            quantity=qty,
            available=qty,
            reserved=0,
            min_quantity=min_qty,
            reorder_qty=int(row.get("reorder_qty", 50) or 50),
            location=row.get("location", "").strip(),
            status="out_of_stock" if qty == 0 else "low_stock" if qty <= min_qty else "in_stock",
            last_updated=date.today().isoformat(),
        )
        db.add(item)
        created += 1

    db.commit()
    return {"imported": created, "total_rows": len(rows)}


@router.post("/import/vendors")
async def import_vendors(file: UploadFile = File(...), user: User = Depends(require("vendors:create")), db: Session = Depends(get_db)):
    content = await file.read()
    rows = _parse_csv(content)
    if not rows:
        raise HTTPException(400, "Empty or invalid CSV")

    created = 0
    ts = int(time.time() * 1000)
    for row in rows:
        name = row.get("name", "").strip()
        if not name:
            continue
        vendor = Vendor(
            id=f"ven_{ts}_{created}",
            organization_id=user.organization_id,
            name=name,
            contact_person=row.get("contact_person", "").strip() or None,
            phone=row.get("phone", "").strip() or None,
            email=row.get("email", "").strip() or None,
            address=row.get("address", "").strip() or None,
            vendor_type=row.get("vendor_type", "").strip() or None,
            status=row.get("status", "active").strip(),
            purchase_history=[],
            outstanding_orders=[],
        )
        db.add(vendor)
        created += 1

    db.commit()
    return {"imported": created, "total_rows": len(rows)}


@router.post("/import/recipients")
async def import_recipients(file: UploadFile = File(...), user: User = Depends(require("recipients:create")), db: Session = Depends(get_db)):
    content = await file.read()
    rows = _parse_csv(content)
    if not rows:
        raise HTTPException(400, "Empty or invalid CSV")

    created = 0
    ts = int(time.time() * 1000)
    for row in rows:
        name = row.get("name", "").strip()
        if not name:
            continue
        r = Recipient(
            id=f"rec_{ts}_{created}",
            organization_id=user.organization_id,
            name=name,
            identifier=row.get("identifier", "").strip() or None,
            group=row.get("group", "").strip() or None,
            contact=row.get("contact", "").strip() or None,
        )
        db.add(r)
        created += 1

    db.commit()
    return {"imported": created, "total_rows": len(rows)}
