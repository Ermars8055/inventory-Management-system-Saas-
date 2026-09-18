import uuid
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from ..database import get_admin_db, get_tenant_db
from ..models import Invoice, OrgCoupon, AuditLog, AdminUser
from ..dependencies import require, get_current_admin

router = APIRouter(prefix="/billing", tags=["admin-billing"])

PLAN_PRICES = {
    "starter": 999,
    "professional": 2999,
    "enterprise": 7999,
}


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


def _calc_discount(base: float, coupon: Optional[OrgCoupon]) -> tuple[float, str, str, float]:
    """Returns (discount_amount, code, type, value)"""
    if not coupon:
        return 0, "", "", 0
    if coupon.discount_type == "percent":
        amt = round(base * coupon.discount_value / 100, 2)
    else:
        amt = min(coupon.discount_value, base)
    return amt, coupon.coupon_code, coupon.discount_type, coupon.discount_value


# ─── Generate invoices for all orgs ──────────────────────────────────────────

@router.post("/generate")
def generate_invoices(
    admin: AdminUser = Depends(require("orgs:billing")),
    admin_db: Session = Depends(get_admin_db),
    tenant_db: Session = Depends(get_tenant_db),
):
    """Generate monthly invoices for all active orgs. Skips orgs that already have an invoice for this period."""
    period = date.today().strftime("%Y-%m")
    due = (date.today().replace(day=1) + timedelta(days=32)).replace(day=1).isoformat()  # 1st of next month

    orgs = tenant_db.execute(text("SELECT id, name, plan FROM organizations")).fetchall()
    created = 0

    for org in orgs:
        org_id, org_name, plan = org.id, org.name, org.plan or "starter"
        base = PLAN_PRICES.get(plan, 999)

        # Skip if already invoiced
        existing = admin_db.execute(text(
            "SELECT id FROM invoices WHERE org_id = :oid AND billing_period = :p"
        ), {"oid": org_id, "p": period}).fetchone()
        if existing:
            continue

        # Check for active coupon
        coupon = admin_db.query(OrgCoupon).filter(OrgCoupon.org_id == org_id).first()
        discount_amt, code, d_type, d_val = _calc_discount(base, coupon)
        final = max(0, base - discount_amt)

        admin_db.add(Invoice(
            id=str(uuid.uuid4()),
            org_id=org_id,
            org_name=org_name,
            plan=plan,
            base_amount=base,
            discount_code=code or None,
            discount_type=d_type or None,
            discount_value=d_val,
            discount_amount=discount_amt,
            final_amount=final,
            status="pending",
            billing_period=period,
            due_date=due,
            created_at=datetime.utcnow().isoformat(),
        ))
        created += 1

    if created > 0:
        admin_db.add(AuditLog(
            id=str(uuid.uuid4()), admin_id=admin.id, admin_email=admin.email,
            action="generate_invoices", target_type="billing", target_id=period,
            detail=f"{created} invoices for {period}",
            created_at=datetime.utcnow().isoformat(),
        ))
    admin_db.commit()
    return {"generated": created, "period": period}


# ─── List all invoices ───────────────────────────────────────────────────────

@router.get("")
def list_invoices(
    admin: AdminUser = Depends(require("orgs:billing")),
    admin_db: Session = Depends(get_admin_db),
):
    invoices = admin_db.query(Invoice).order_by(Invoice.created_at.desc()).limit(500).all()
    return [
        {
            "id": i.id, "orgId": i.org_id, "orgName": i.org_name, "plan": i.plan,
            "baseAmount": i.base_amount, "discountCode": i.discount_code,
            "discountAmount": i.discount_amount, "finalAmount": i.final_amount,
            "status": i.status, "billingPeriod": i.billing_period,
            "dueDate": i.due_date, "paidDate": i.paid_date, "createdAt": i.created_at,
        }
        for i in invoices
    ]


# ─── Get invoices for a specific org ─────────────────────────────────────────

@router.get("/org/{org_id}")
def org_invoices(
    org_id: str,
    admin: AdminUser = Depends(require("orgs:billing")),
    admin_db: Session = Depends(get_admin_db),
):
    invoices = admin_db.query(Invoice).filter(Invoice.org_id == org_id).order_by(Invoice.created_at.desc()).all()
    return [
        {
            "id": i.id, "plan": i.plan, "baseAmount": i.base_amount,
            "discountCode": i.discount_code, "discountAmount": i.discount_amount,
            "finalAmount": i.final_amount, "status": i.status,
            "billingPeriod": i.billing_period, "dueDate": i.due_date,
            "paidDate": i.paid_date,
        }
        for i in invoices
    ]


# ─── Mark invoice as paid (demo — no real payment) ──────────────────────────

@router.patch("/{invoice_id}/pay")
def mark_paid(
    invoice_id: str,
    admin: AdminUser = Depends(require("orgs:billing")),
    admin_db: Session = Depends(get_admin_db),
):
    inv = admin_db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.status = "paid"
    inv.paid_date = datetime.utcnow().isoformat()
    admin_db.add(AuditLog(
        id=str(uuid.uuid4()), admin_id=admin.id, admin_email=admin.email,
        action="mark_invoice_paid", target_type="invoice", target_id=inv.id,
        detail=f"{inv.org_name} — ₹{inv.final_amount} ({inv.billing_period})",
        created_at=datetime.utcnow().isoformat(),
    ))
    admin_db.commit()
    return {"ok": True}


# ─── Mark invoice as overdue ─────────────────────────────────────────────────

@router.patch("/{invoice_id}/overdue")
def mark_overdue(
    invoice_id: str,
    admin: AdminUser = Depends(require("orgs:billing")),
    admin_db: Session = Depends(get_admin_db),
):
    inv = admin_db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.status = "overdue"
    admin_db.commit()
    return {"ok": True}
