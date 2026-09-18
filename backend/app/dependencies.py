from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import SessionLocal
from .auth import decode_token
from .rbac import has_permission
from .models import User, Organization, Item

bearer = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    # Enforce subdomain org isolation
    subdomain_org_id = getattr(request.state, "subdomain_org_id", None)
    if subdomain_org_id and user.organization_id != subdomain_org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: account does not belong to this organization")
    return user


def require(permission: str):
    """Dependency factory — requires a specific permission."""
    def _check(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}",
            )
        return current_user
    return _check


def same_org(org_id: str, user: User):
    """Raise 403 if user doesn't belong to the requested org."""
    if user.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


# ─── Plan limits ─────────────────────────────────────────────────────────────

PLAN_LIMITS = {
    "starter":      {"max_users": 3,  "max_items": 1000,  "max_modules": 5},
    "professional": {"max_users": 10, "max_items": 5000,  "max_modules": 10},
    "enterprise":   {"max_users": 50, "max_items": 50000, "max_modules": 14},
}


def get_plan_limits(org_id: str, db: Session) -> dict:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    tier = org.plan if org else "starter"
    return PLAN_LIMITS.get(tier, PLAN_LIMITS["starter"])


def get_usage(org_id: str, db: Session) -> dict:
    user_count = db.query(User).filter(User.organization_id == org_id, User.status == "active").count()
    item_count = db.query(Item).filter(Item.organization_id == org_id).count()
    org = db.query(Organization).filter(Organization.id == org_id).first()
    module_count = len(org.enabled_modules) if org and org.enabled_modules else 0
    return {"users": user_count, "items": item_count, "modules": module_count}


def check_limit(resource: str, user: User, db: Session):
    """Raise 403 if org has hit the plan limit for the given resource."""
    limits = get_plan_limits(user.organization_id, db)
    usage = get_usage(user.organization_id, db)
    limit_key = f"max_{resource}"
    if limit_key in limits and usage.get(resource, 0) >= limits[limit_key]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Plan limit reached: {usage[resource]}/{limits[limit_key]} {resource}. Upgrade your plan to add more.",
        )
