"""Global search — searches across items, vendors, recipients, transactions."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Item, Vendor, Recipient, StockTransaction, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search(q: str = Query(..., min_length=1), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = user.organization_id
    term = f"%{q.lower()}%"
    results = []

    # Items
    items = db.query(Item).filter(
        Item.organization_id == org,
        (Item.name.ilike(term) | Item.sku.ilike(term) | Item.category_name.ilike(term))
    ).limit(5).all()
    for i in items:
        results.append({"type": "item", "id": i.id, "title": i.name, "subtitle": f"{i.sku} · {i.category_name or ''}", "url": f"/inventory/{i.id}"})

    # Vendors
    vendors = db.query(Vendor).filter(
        Vendor.organization_id == org,
        (Vendor.name.ilike(term) | Vendor.email.ilike(term) | Vendor.vendor_type.ilike(term))
    ).limit(5).all()
    for v in vendors:
        results.append({"type": "vendor", "id": v.id, "title": v.name, "subtitle": v.vendor_type or v.email or "", "url": f"/vendors/{v.id}"})

    # Recipients
    recipients = db.query(Recipient).filter(
        Recipient.organization_id == org,
        (Recipient.name.ilike(term) | Recipient.identifier.ilike(term) | Recipient.group.ilike(term))
    ).limit(5).all()
    for r in recipients:
        results.append({"type": "recipient", "id": r.id, "title": r.name, "subtitle": f"{r.identifier or ''} · {r.group or ''}", "url": f"/recipients/{r.id}"})

    # Transactions
    txs = db.query(StockTransaction).filter(
        StockTransaction.organization_id == org,
        (StockTransaction.item_name.ilike(term) | StockTransaction.reference.ilike(term))
    ).limit(5).all()
    for t in txs:
        results.append({"type": "transaction", "id": t.id, "title": t.item_name or "", "subtitle": f"{t.type} · {t.reference or ''} · {t.date}", "url": "/transactions"})

    return results
