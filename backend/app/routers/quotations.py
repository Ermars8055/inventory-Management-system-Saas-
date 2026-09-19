"""
Vendor Quotation System — Option B (prices collected per-quotation, not from catalogue).
"""
import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    Quotation, QuotationItem, VendorQuote, VendorQuoteItem,
    PurchaseOrder, POLineItem, Vendor, User,
)
from ..schemas import (
    QuotationOut, QuotationCreate, QuotationUpdate, QuotationItemCreate,
    VendorQuoteOut, VendorQuoteCreate, VendorQuoteSubmit,
    GeneratePOsBody, PurchaseOrderOut,
)
from ..dependencies import require, same_org
from ..pagination import sanitize

router = APIRouter(prefix="/quotations", tags=["quotations"])


# ─── Quotations CRUD ─────────────────────────────────────────────────────────

@router.get("", response_model=list[QuotationOut])
def list_quotations(user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    return (
        db.query(Quotation)
        .filter(Quotation.organization_id == user.organization_id)
        .order_by(Quotation.created_at.desc())
        .all()
    )


@router.post("", response_model=QuotationOut, status_code=201)
def create_quotation(body: QuotationCreate, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    ts = int(time.time() * 1000)
    q = Quotation(
        id=f"quot_{ts}",
        organization_id=user.organization_id,
        title=body.title,
        notes=body.notes,
        status="draft",
        created_at=date.today().isoformat(),
    )
    db.add(q)
    for i, item in enumerate(body.items):
        db.add(QuotationItem(
            id=f"qi_{ts}_{i}",
            quotation_id=q.id,
            item_id=item.item_id,
            item_name=item.item_name,
            qty_needed=item.qty_needed,
        ))
    db.commit()
    db.refresh(q)
    return q


@router.get("/{qid}", response_model=QuotationOut)
def get_quotation(qid: str, user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)
    return q


@router.put("/{qid}", response_model=QuotationOut)
def update_quotation(qid: str, body: QuotationUpdate, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(q, field, value)
    db.commit()
    db.refresh(q)
    return q


@router.delete("/{qid}", status_code=204)
def delete_quotation(qid: str, user: User = Depends(require("inventory:delete")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)
    db.delete(q)
    db.commit()


# ─── Quotation Items ──────────────────────────────────────────────────────────

@router.post("/{qid}/items", response_model=QuotationOut, status_code=201)
def add_quotation_item(qid: str, body: QuotationItemCreate, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)
    ts = int(time.time() * 1000)
    db.add(QuotationItem(
        id=f"qi_{ts}",
        quotation_id=qid,
        item_id=body.item_id,
        item_name=body.item_name,
        qty_needed=body.qty_needed,
    ))
    db.commit()
    db.refresh(q)
    return q


@router.delete("/{qid}/items/{item_id}", response_model=QuotationOut)
def remove_quotation_item(qid: str, item_id: str, user: User = Depends(require("inventory:delete")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)
    qi = db.query(QuotationItem).filter(
        QuotationItem.id == item_id, QuotationItem.quotation_id == qid
    ).first()
    if not qi:
        raise HTTPException(404, "Item not found")
    db.delete(qi)
    db.commit()
    db.refresh(q)
    return q


# ─── Vendor Quotes ────────────────────────────────────────────────────────────

@router.post("/{qid}/vendors", response_model=QuotationOut, status_code=201)
def invite_vendor(qid: str, body: VendorQuoteCreate, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)

    email = body.vendor_email
    if not email and body.vendor_id:
        ven = db.query(Vendor).filter(Vendor.id == body.vendor_id).first()
        if ven:
            email = ven.email

    vq = VendorQuote(
        id=f"vq_{int(time.time() * 1000)}",
        quotation_id=qid,
        vendor_id=body.vendor_id,
        vendor_name=body.vendor_name,
        vendor_email=email,
        status="invited",
    )
    db.add(vq)
    db.commit()
    db.refresh(q)
    return q


@router.delete("/{qid}/vendors/{vq_id}", response_model=QuotationOut)
def remove_vendor(qid: str, vq_id: str, user: User = Depends(require("inventory:delete")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)
    vq = db.query(VendorQuote).filter(
        VendorQuote.id == vq_id, VendorQuote.quotation_id == qid
    ).first()
    if not vq:
        raise HTTPException(404, "Vendor quote not found")
    db.delete(vq)
    db.commit()
    db.refresh(q)
    return q


@router.post("/{qid}/vendors/{vq_id}/submit", response_model=QuotationOut)
def submit_vendor_quote(qid: str, vq_id: str, body: VendorQuoteSubmit, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)
    vq = db.query(VendorQuote).filter(
        VendorQuote.id == vq_id, VendorQuote.quotation_id == qid
    ).first()
    if not vq:
        raise HTTPException(404, "Vendor quote not found")

    for existing in vq.quote_items:
        db.delete(existing)

    ts = int(time.time() * 1000)
    for i, item in enumerate(body.items):
        db.add(VendorQuoteItem(
            id=f"vqi_{ts}_{i}",
            vendor_quote_id=vq_id,
            quotation_item_id=item.quotation_item_id,
            unit_price=item.unit_price,
            lead_time_days=item.lead_time_days,
            notes=item.notes,
        ))

    vq.status = "quoted"
    vq.quoted_at = date.today().isoformat()
    if body.notes:
        vq.notes = body.notes

    db.commit()
    db.refresh(q)
    return q


@router.patch("/{qid}/vendors/{vq_id}/reject", response_model=QuotationOut)
def reject_vendor(qid: str, vq_id: str, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)
    vq = db.query(VendorQuote).filter(
        VendorQuote.id == vq_id, VendorQuote.quotation_id == qid
    ).first()
    if not vq:
        raise HTTPException(404, "Vendor quote not found")
    vq.status = "rejected"
    db.commit()
    db.refresh(q)
    return q


# ─── Generate POs ────────────────────────────────────────────────────────────

@router.post("/{qid}/generate-pos", response_model=list[PurchaseOrderOut], status_code=201)
def generate_pos(qid: str, body: GeneratePOsBody, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    same_org(q.organization_id, user)
    if not body.selections:
        raise HTTPException(400, "No selections provided")

    items_by_id = {i.id: i for i in q.items}
    vq_by_id = {vq.id: vq for vq in q.vendor_quotes}

    groups: dict[str, list[tuple]] = {}
    for qi_id, vq_id in body.selections.items():
        qi = items_by_id.get(qi_id)
        vq = vq_by_id.get(vq_id)
        if not qi or not vq:
            continue
        price = next(
            (x.unit_price for x in vq.quote_items if x.quotation_item_id == qi_id),
            0,
        ) or 0
        groups.setdefault(vq_id, []).append((qi, vq, price))

    created_pos = []
    ts = int(time.time() * 1000)
    po_counter = 1

    for vq_id, line_data in groups.items():
        vq = vq_by_id[vq_id]
        total = sum(int(price * item.qty_needed) for item, _, price in line_data)
        items_desc = ", ".join(f"{item.item_name} x{item.qty_needed}" for item, _, _ in line_data)

        po = PurchaseOrder(
            id=f"po_{ts}_{po_counter}",
            organization_id=user.organization_id,
            po_number=f"PO-{date.today().strftime('%Y%m%d')}-{ts % 10000}-{po_counter:02d}",
            vendor_name=vq.vendor_name,
            vendor_id=vq.vendor_id,
            items_desc=items_desc,
            item_count=len(line_data),
            expected_date=body.expected_date,
            amount=total,
            status="ordered",
            raised_by=body.raised_by,
            notes=body.notes,
            created_at=date.today().isoformat(),
            quotation_id=qid,
        )
        db.add(po)

        for idx, (item, _, price) in enumerate(line_data):
            db.add(POLineItem(
                id=f"poli_{ts}_{po_counter}_{idx}",
                po_id=po.id,
                item_id=item.item_id,
                item_name=item.item_name,
                quantity_ordered=item.qty_needed,
                quantity_received=0,
                unit_price=int(price),
            ))

        created_pos.append(po)
        po_counter += 1
        ts += 1

    q.status = "converted"
    db.commit()

    for po in created_pos:
        db.refresh(po)

    return created_pos
