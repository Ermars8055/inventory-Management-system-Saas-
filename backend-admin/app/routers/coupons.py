import uuid
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_admin_db
from ..models import Coupon, OrgCoupon, AuditLog, AdminUser
from ..dependencies import require

router = APIRouter(prefix="/coupons", tags=["admin-coupons"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class CouponCreate(BaseModel):
    code: str
    discount_type: str  # "percent" | "flat"
    discount_value: float
    applicable_plans: str = "all"
    max_uses: int = 0
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


class CouponUpdate(BaseModel):
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    applicable_plans: Optional[str] = None
    max_uses: Optional[int] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    is_active: Optional[bool] = None


class RedeemRequest(BaseModel):
    code: str
    org_id: str
    org_plan: str = "starter"


# ─── Admin CRUD ──────────────────────────────────────────────────────────────

@router.get("")
def list_coupons(admin: AdminUser = Depends(require("orgs:billing")), db: Session = Depends(get_admin_db)):
    coupons = db.query(Coupon).order_by(Coupon.created_at.desc()).all()
    return [
        {
            "id": c.id, "code": c.code, "discountType": c.discount_type,
            "discountValue": c.discount_value, "applicablePlans": c.applicable_plans,
            "maxUses": c.max_uses, "usesCount": c.uses_count,
            "validFrom": c.valid_from, "validUntil": c.valid_until,
            "isActive": c.is_active, "createdAt": c.created_at,
        }
        for c in coupons
    ]


@router.post("")
def create_coupon(body: CouponCreate, admin: AdminUser = Depends(require("orgs:billing")), db: Session = Depends(get_admin_db)):
    if db.query(Coupon).filter(Coupon.code == body.code.upper()).first():
        raise HTTPException(400, "Coupon code already exists")
    c = Coupon(
        id=str(uuid.uuid4()),
        code=body.code.upper(),
        discount_type=body.discount_type,
        discount_value=body.discount_value,
        applicable_plans=body.applicable_plans,
        max_uses=body.max_uses,
        uses_count=0,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
        is_active=True,
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(c)
    db.add(AuditLog(
        id=str(uuid.uuid4()), admin_id=admin.id, admin_email=admin.email,
        action="create_coupon", target_type="coupon", target_id=c.id,
        detail=f"{c.code} — {c.discount_type} {c.discount_value}",
        created_at=datetime.utcnow().isoformat(),
    ))
    db.commit()
    return {"id": c.id, "code": c.code}


@router.put("/{coupon_id}")
def update_coupon(coupon_id: str, body: CouponUpdate, admin: AdminUser = Depends(require("orgs:billing")), db: Session = Depends(get_admin_db)):
    c = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not c:
        raise HTTPException(404, "Coupon not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    db.commit()
    return {"ok": True}


@router.delete("/{coupon_id}", status_code=204)
def deactivate_coupon(coupon_id: str, admin: AdminUser = Depends(require("orgs:billing")), db: Session = Depends(get_admin_db)):
    c = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not c:
        raise HTTPException(404, "Coupon not found")
    c.is_active = False
    db.commit()


@router.get("/{coupon_id}/usage")
def coupon_usage(coupon_id: str, admin: AdminUser = Depends(require("orgs:billing")), db: Session = Depends(get_admin_db)):
    usages = db.query(OrgCoupon).filter(OrgCoupon.coupon_id == coupon_id).all()
    return [{"orgId": u.org_id, "couponCode": u.coupon_code, "appliedAt": u.applied_at} for u in usages]


# ─── Redeem (called by tenant app or admin) ─────────────────────────────────

@router.post("/redeem")
def redeem_coupon(body: RedeemRequest, db: Session = Depends(get_admin_db)):
    """Validate and apply a coupon code for an org. No admin auth required — tenant app calls this."""
    c = db.query(Coupon).filter(Coupon.code == body.code.upper(), Coupon.is_active == True).first()
    if not c:
        raise HTTPException(404, "Invalid or expired coupon code")

    # Check expiry
    today = date.today().isoformat()
    if c.valid_from and today < c.valid_from:
        raise HTTPException(400, "Coupon is not yet valid")
    if c.valid_until and today > c.valid_until:
        raise HTTPException(400, "Coupon has expired")

    # Check max uses
    if c.max_uses > 0 and c.uses_count >= c.max_uses:
        raise HTTPException(400, "Coupon has reached maximum uses")

    # Check applicable plans
    if c.applicable_plans and c.applicable_plans != "all":
        allowed = [p.strip() for p in c.applicable_plans.split(",")]
        if body.org_plan not in allowed:
            raise HTTPException(400, f"Coupon not valid for {body.org_plan} plan")

    # Check if org already used this coupon
    existing = db.query(OrgCoupon).filter(OrgCoupon.org_id == body.org_id, OrgCoupon.coupon_id == c.id).first()
    if existing:
        raise HTTPException(400, "Coupon already applied to this organization")

    # Apply
    db.add(OrgCoupon(
        id=str(uuid.uuid4()),
        org_id=body.org_id,
        coupon_id=c.id,
        coupon_code=c.code,
        discount_type=c.discount_type,
        discount_value=c.discount_value,
        applied_at=datetime.utcnow().isoformat(),
    ))
    c.uses_count = (c.uses_count or 0) + 1
    db.commit()

    return {
        "applied": True,
        "code": c.code,
        "discountType": c.discount_type,
        "discountValue": c.discount_value,
    }
