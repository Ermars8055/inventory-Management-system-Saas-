import os
import uuid
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from ..database import get_db
from ..models import Organization, User
from ..schemas import SubscriptionOut
from ..dependencies import get_current_user, require, get_plan_limits, get_usage

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

PLANS = [
    SubscriptionOut(tier="starter", name="Starter", price=999, price_period="month",
                    max_users=3, max_items=1000, max_modules=5,
                    features=["3 users", "1,000 inventory items", "5 modules", "Basic reports"]),
    SubscriptionOut(tier="professional", name="Professional", price=2999, price_period="month",
                    max_users=10, max_items=5000, max_modules=10,
                    features=["10 users", "5,000 inventory items", "10 modules", "Reports", "QR / Barcode", "Custom fields"]),
    SubscriptionOut(tier="enterprise", name="Enterprise", price=7999, price_period="month",
                    max_users=50, max_items=50000, max_modules=14,
                    features=["50 users", "50,000 inventory items", "All modules", "Advanced reports", "QR / Barcode", "Custom fields", "Priority support", "API access"]),
]

PLANS_BY_TIER = {p.tier: p for p in PLANS}


@router.get("")
def list_subscriptions():
    return [p.model_dump() for p in PLANS]


@router.get("/plans")
def list_plans():
    return [p.model_dump() for p in PLANS]


@router.get("/current")
def get_current_subscription(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    tier = org.plan if org and org.plan else "starter"
    plan = PLANS_BY_TIER.get(tier, PLANS[0])
    return plan.model_dump()


@router.get("/usage")
def get_plan_usage(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limits = get_plan_limits(user.organization_id, db)
    usage = get_usage(user.organization_id, db)
    return {
        "limits": limits,
        "usage": usage,
    }


class PlanUpdateBody(BaseModel):
    tier: str


@router.patch("/current")
def update_current_subscription(body: PlanUpdateBody, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    if body.tier not in PLANS_BY_TIER:
        raise HTTPException(400, f"Unknown plan tier: {body.tier}")
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")
    org.plan = body.tier
    db.commit()
    return PLANS_BY_TIER[body.tier].model_dump()


# ─── Coupon Redemption (reads admin DB directly) ────────────────────────────

def _get_admin_engine():
    admin_db_url = os.getenv("ADMIN_DB_URL", "sqlite:////data/admin.db")
    kwargs = {"check_same_thread": False} if admin_db_url.startswith("sqlite") else {}
    return create_engine(admin_db_url, connect_args=kwargs)


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RedeemCouponBody(_Camel):
    code: str


@router.post("/redeem-coupon")
def redeem_coupon(body: RedeemCouponBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")

    engine = _get_admin_engine()
    code = body.code.upper()
    today = date.today().isoformat()

    with engine.connect() as conn:
        c = conn.execute(text(
            "SELECT * FROM coupons WHERE code = :code AND is_active = 1"
        ), {"code": code}).fetchone()
        if not c:
            raise HTTPException(404, "Invalid or expired coupon code")

        c_dict = dict(c._mapping)

        if c_dict.get("valid_from") and today < c_dict["valid_from"]:
            raise HTTPException(400, "Coupon is not yet valid")
        if c_dict.get("valid_until") and today > c_dict["valid_until"]:
            raise HTTPException(400, "Coupon has expired")
        if c_dict["max_uses"] > 0 and (c_dict.get("uses_count") or 0) >= c_dict["max_uses"]:
            raise HTTPException(400, "Coupon has reached maximum uses")

        applicable = c_dict.get("applicable_plans") or "all"
        if applicable != "all":
            allowed = [p.strip() for p in applicable.split(",")]
            if org.plan not in allowed:
                raise HTTPException(400, f"Coupon not valid for {org.plan} plan")

        existing = conn.execute(text(
            "SELECT id FROM org_coupons WHERE org_id = :oid AND coupon_id = :cid"
        ), {"oid": org.id, "cid": c_dict["id"]}).fetchone()
        if existing:
            raise HTTPException(400, "Coupon already applied to this organization")

        conn.execute(text(
            "INSERT INTO org_coupons (id, org_id, coupon_id, coupon_code, discount_type, discount_value, applied_at) VALUES (:id, :oid, :cid, :code, :dt, :dv, :at)"
        ), {
            "id": str(uuid.uuid4()), "oid": org.id, "cid": c_dict["id"],
            "code": code, "dt": c_dict["discount_type"], "dv": c_dict["discount_value"],
            "at": datetime.utcnow().isoformat(),
        })
        conn.execute(text(
            "UPDATE coupons SET uses_count = uses_count + 1 WHERE id = :id"
        ), {"id": c_dict["id"]})
        conn.commit()

    return {
        "applied": True,
        "code": code,
        "discountType": c_dict["discount_type"],
        "discountValue": c_dict["discount_value"],
    }


# ─── Tenant invoice views (reads admin DB) ───────────────────────────────────

@router.get("/invoices")
def my_invoices(user: User = Depends(get_current_user)):
    engine = _get_admin_engine()
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT * FROM invoices WHERE org_id = :oid ORDER BY created_at DESC"
        ), {"oid": user.organization_id}).fetchall()
    return [
        {
            "id": r.id, "plan": r.plan, "baseAmount": r.base_amount,
            "discountCode": r.discount_code, "discountAmount": r.discount_amount,
            "finalAmount": r.final_amount, "status": r.status,
            "billingPeriod": r.billing_period, "dueDate": r.due_date,
            "paidDate": r.paid_date,
        }
        for r in rows
    ]


@router.post("/invoices/{invoice_id}/pay")
def pay_invoice(invoice_id: str, user: User = Depends(get_current_user)):
    """Demo payment — marks invoice as paid without real payment gateway."""
    engine = _get_admin_engine()
    with engine.connect() as conn:
        inv = conn.execute(text(
            "SELECT * FROM invoices WHERE id = :id AND org_id = :oid"
        ), {"id": invoice_id, "oid": user.organization_id}).fetchone()
        if not inv:
            raise HTTPException(404, "Invoice not found")
        if inv.status == "paid":
            raise HTTPException(400, "Invoice already paid")
        conn.execute(text(
            "UPDATE invoices SET status = 'paid', paid_date = :now WHERE id = :id"
        ), {"now": datetime.utcnow().isoformat(), "id": invoice_id})
        conn.commit()
    return {"paid": True, "invoiceId": invoice_id}
