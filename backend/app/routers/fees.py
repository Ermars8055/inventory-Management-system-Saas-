"""
Fee-first distribution system.
Flow: assign package → pay fee → distribute items.
"""
import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from ..database import get_db
from ..models import FeeRecord, ClassTemplate, OrgClass, OrgClassItem, Recipient, Assignment, Item, Organization, User, StockTransaction
from ..schemas import FeeRecordOut
from ..dependencies import require, same_org

router = APIRouter(prefix="/fees", tags=["fees"])


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AssignPackageBody(_Camel):
    recipient_id: str
    template_id: str
    notes: Optional[str] = None


class PayBody(_Camel):
    amount: int
    notes: Optional[str] = None


# ─── List fees for org or recipient ──────────────────────────────────────────

@router.get("", response_model=list[FeeRecordOut])
def list_fees(
    recipient_id: Optional[str] = Query(None),
    user: User = Depends(require("assignments:read")),
    db: Session = Depends(get_db),
):
    q = db.query(FeeRecord).filter(FeeRecord.organization_id == user.organization_id)
    if recipient_id:
        q = q.filter(FeeRecord.recipient_id == recipient_id)
    return q.order_by(FeeRecord.created_at.desc()).all()


# ─── Assign package to student (creates fee record) ─────────────────────────

@router.post("", response_model=FeeRecordOut, status_code=201)
def assign_package(
    body: AssignPackageBody,
    user: User = Depends(require("assignments:create")),
    db: Session = Depends(get_db),
):
    recipient = db.query(Recipient).filter(Recipient.id == body.recipient_id).first()
    if not recipient:
        raise HTTPException(404, "Recipient not found")
    same_org(recipient.organization_id, user)

    template = db.query(ClassTemplate).filter(ClassTemplate.id == body.template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
    same_org(template.organization_id, user)

    if not template.items:
        raise HTTPException(400, "Template has no items")

    # Calculate total fee from template items
    total = sum((ti.unit_price or 0) * (ti.quantity or 1) for ti in template.items)

    # Link to class if recipient is enrolled in one
    class_id = recipient.class_id
    class_name = None
    if class_id:
        cls = db.query(OrgClass).filter(OrgClass.id == class_id).first()
        class_name = cls.name if cls else None

    fee = FeeRecord(
        id=f"fee_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        recipient_id=recipient.id,
        recipient_name=recipient.name,
        class_id=class_id,
        class_name=class_name,
        template_id=template.id,
        template_name=template.name,
        total_amount=total,
        paid_amount=0,
        status="unpaid" if total > 0 else "waived",
        notes=body.notes,
        created_at=date.today().isoformat(),
    )
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return fee


# ─── Record payment ──────────────────────────────────────────────────────────

@router.patch("/{fee_id}/pay", response_model=FeeRecordOut)
def record_payment(
    fee_id: str,
    body: PayBody,
    user: User = Depends(require("assignments:update")),
    db: Session = Depends(get_db),
):
    fee = db.query(FeeRecord).filter(FeeRecord.id == fee_id).first()
    if not fee:
        raise HTTPException(404, "Fee record not found")
    same_org(fee.organization_id, user)

    if fee.status == "distributed":
        raise HTTPException(400, "Already distributed")

    fee.paid_amount = min(fee.paid_amount + body.amount, fee.total_amount)
    if fee.paid_amount >= fee.total_amount:
        fee.status = "paid"
    else:
        fee.status = "partial"
    fee.payment_date = date.today().isoformat()
    if body.notes:
        fee.notes = (fee.notes or "") + f"\nPayment: ₹{body.amount} on {date.today().isoformat()}"
    db.commit()
    db.refresh(fee)
    return fee


# ─── Waive fee ───────────────────────────────────────────────────────────────

@router.patch("/{fee_id}/waive", response_model=FeeRecordOut)
def waive_fee(
    fee_id: str,
    user: User = Depends(require("assignments:update")),
    db: Session = Depends(get_db),
):
    fee = db.query(FeeRecord).filter(FeeRecord.id == fee_id).first()
    if not fee:
        raise HTTPException(404, "Fee record not found")
    same_org(fee.organization_id, user)
    fee.status = "waived"
    fee.paid_amount = fee.total_amount
    db.commit()
    db.refresh(fee)
    return fee


# ─── Distribute (only after paid/waived) ────────────────────────────────────

@router.post("/{fee_id}/distribute", response_model=FeeRecordOut)
def distribute(
    fee_id: str,
    user: User = Depends(require("assignments:create")),
    db: Session = Depends(get_db),
):
    fee = db.query(FeeRecord).filter(FeeRecord.id == fee_id).first()
    if not fee:
        raise HTTPException(404, "Fee record not found")
    same_org(fee.organization_id, user)

    if fee.status not in ("paid", "waived"):
        raise HTTPException(400, f"Cannot distribute — fee status is '{fee.status}'. Payment required first.")

    if fee.status == "distributed":
        raise HTTPException(400, "Already distributed")

    recipient = db.query(Recipient).filter(
        Recipient.id == fee.recipient_id,
        Recipient.organization_id == user.organization_id,
    ).first()
    if not recipient:
        raise HTTPException(404, "Recipient not found")

    # Resolve item list: prefer class-based flow, fall back to template flow
    if fee.class_id:
        cls = db.query(OrgClass).filter(
            OrgClass.id == fee.class_id,
            OrgClass.organization_id == user.organization_id,
        ).first()
        if not cls or not cls.items:
            raise HTTPException(400, "Class not found or has no items")
        items_to_distribute = [
            {
                "item_id": ci.item_id,
                "item_name": ci.item_name,
                "quantity": ci.quantity,
                "condition_issued": ci.condition_issued or "New",
                "unit_price": ci.unit_price or 0,
                "source_name": cls.name,
                "source_id": None,
            }
            for ci in cls.items
        ]
    else:
        template = db.query(ClassTemplate).filter(
            ClassTemplate.id == fee.template_id,
            ClassTemplate.organization_id == user.organization_id,
        ).first()
        if not template or not template.items:
            raise HTTPException(400, "Template not found or has no items")
        items_to_distribute = [
            {
                "item_id": ti.item_id,
                "item_name": ti.item_name,
                "quantity": ti.quantity,
                "condition_issued": ti.condition_issued or "New",
                "unit_price": ti.unit_price or 0,
                "source_name": template.name,
                "source_id": template.id,
            }
            for ti in template.items
        ]

    # Determine mode
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    org_config = org.config or {} if org else {}
    mode = org_config.get("assignmentMode", "distribution")
    is_distribution = mode == "distribution"

    from ..routers.inventory import _compute_status

    today = date.today().isoformat()
    ts = int(time.time() * 1000)
    for idx, item in enumerate(items_to_distribute):
        db.add(Assignment(
            id=f"asgn_{ts}_{idx}",
            organization_id=user.organization_id,
            recipient_id=recipient.id,
            recipient_name=recipient.name,
            recipient_identifier=recipient.identifier,
            recipient_group=recipient.group,
            item_id=item["item_id"],
            item_name=item["item_name"],
            quantity=item["quantity"],
            condition_issued=item["condition_issued"],
            issue_date=today,
            issued_by=user.name,
            mode=mode,
            status="distributed" if is_distribution else "issued",
            template_id=item["source_id"],
            template_name=item["source_name"],
            unit_price=item["unit_price"],
            fee_amount=item["unit_price"] * item["quantity"],
            fee_status="paid",
        ))

        # Always create stock transaction
        db.add(StockTransaction(
            id=f"tx_{ts}_{idx}",
            organization_id=user.organization_id,
            date=today,
            item_id=item["item_id"],
            item_name=item["item_name"],
            type="issued",
            quantity=-item["quantity"],
            user=user.name,
            reference=f"FEE-{fee.id[-8:]}",
            recipient=recipient.name,
            recipient_class=recipient.group,
            notes=f"Distributed: {item['source_name']}",
        ))

        # Always reduce inventory (when item is linked)
        if item["item_id"]:
            inv_item = db.query(Item).filter(Item.id == item["item_id"]).first()
            if inv_item:
                if is_distribution:
                    inv_item.available = max(0, inv_item.available - item["quantity"])
                else:
                    inv_item.reserved = (inv_item.reserved or 0) + item["quantity"]
                    inv_item.available = max(0, inv_item.quantity - inv_item.reserved)
                inv_item.status = _compute_status(inv_item.available, inv_item.min_quantity or 10)
                inv_item.last_updated = today

    fee.status = "distributed"
    fee.distributed_date = today
    db.commit()
    db.refresh(fee)
    return fee
