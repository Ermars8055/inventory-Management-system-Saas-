from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
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
