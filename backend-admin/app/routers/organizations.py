from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from ..database import get_tenant_db, get_admin_db
from ..dependencies import require, get_current_admin
from ..models import AdminUser, AuditLog
from ..auth import create_token
import uuid, json
from datetime import datetime, timedelta


def _parse_org(row: dict) -> dict:
    """Parse JSON string fields on org rows."""
    if isinstance(row.get("enabled_modules"), str):
        try:
            row["enabled_modules"] = json.loads(row["enabled_modules"])
        except (ValueError, TypeError):
            row["enabled_modules"] = []
    return row

router = APIRouter(prefix="/organizations", tags=["admin-orgs"])


def _log(db: Session, admin: AdminUser, action: str, target_type: str, target_id: str, detail: str = ""):
    db.add(AuditLog(
        id=str(uuid.uuid4()),
        admin_id=admin.id,
        admin_email=admin.email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        created_at=datetime.utcnow().isoformat(),
    ))
    db.commit()


@router.get("")
def list_orgs(
    admin: AdminUser = Depends(require("orgs:read")),
    tenant_db: Session = Depends(get_tenant_db),
):
    rows = tenant_db.execute(text("""
        SELECT
            o.id, o.name, o.industry, o.plan, o.created_at, o.email,
            o.enabled_modules,
            (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) as user_count,
            (SELECT COUNT(*) FROM items i WHERE i.organization_id = o.id) as item_count,
            (SELECT COUNT(*) FROM recipients r WHERE r.organization_id = o.id) as recipient_count,
            (SELECT COUNT(*) FROM assignments a WHERE a.organization_id = o.id) as assignment_count,
            (SELECT COUNT(*) FROM vendors v WHERE v.organization_id = o.id) as vendor_count
        FROM organizations o
        ORDER BY o.created_at DESC
    """)).fetchall()

    return [_parse_org(dict(r._mapping)) for r in rows]


@router.get("/{org_id}")
def get_org(
    org_id: str,
    admin: AdminUser = Depends(require("orgs:read")),
    tenant_db: Session = Depends(get_tenant_db),
):
    row = tenant_db.execute(text("""
        SELECT o.*,
            (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) as user_count,
            (SELECT COUNT(*) FROM items i WHERE i.organization_id = o.id) as item_count,
            (SELECT COUNT(*) FROM recipients r WHERE r.organization_id = o.id) as recipient_count,
            (SELECT COUNT(*) FROM assignments a WHERE a.organization_id = o.id) as assignment_count,
            (SELECT COUNT(*) FROM vendors v WHERE v.organization_id = o.id) as vendor_count
        FROM organizations o WHERE o.id = :org_id
    """), {"org_id": org_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _parse_org(dict(row._mapping))


class PlanUpdate(BaseModel):
    plan: str


@router.patch("/{org_id}/plan")
def update_plan(
    org_id: str,
    body: PlanUpdate,
    admin: AdminUser = Depends(require("orgs:billing")),
    tenant_db: Session = Depends(get_tenant_db),
    admin_db: Session = Depends(get_admin_db),
):
    tenant_db.execute(text("UPDATE organizations SET plan = :plan WHERE id = :id"), {"plan": body.plan, "id": org_id})
    tenant_db.commit()
    _log(admin_db, admin, "update_plan", "org", org_id, f"plan → {body.plan}")
    return {"ok": True}


class StatusUpdate(BaseModel):
    status: str   # "active" | "suspended"


@router.patch("/{org_id}/status")
def update_status(
    org_id: str,
    body: StatusUpdate,
    admin: AdminUser = Depends(require("orgs:read")),
    tenant_db: Session = Depends(get_tenant_db),
    admin_db: Session = Depends(get_admin_db),
):
    # We store status on the org via a simple column update
    # For now mark all users in that org as active/inactive
    new_status = "active" if body.status == "active" else "inactive"
    tenant_db.execute(
        text("UPDATE users SET status = :s WHERE organization_id = :id"),
        {"s": new_status, "id": org_id},
    )
    tenant_db.commit()
    _log(admin_db, admin, f"{body.status}_org", "org", org_id)
    return {"ok": True}


@router.post("/{org_id}/impersonate")
def impersonate(
    org_id: str,
    admin: AdminUser = Depends(require("orgs:impersonate")),
    tenant_db: Session = Depends(get_tenant_db),
    admin_db: Session = Depends(get_admin_db),
):
    """Return a short-lived tenant JWT for the org's admin user."""
    from jose import jwt as jose_jwt
    import os

    org_admin = tenant_db.execute(
        text("SELECT * FROM users WHERE organization_id = :id AND role = 'org_admin' AND status = 'active' LIMIT 1"),
        {"id": org_id},
    ).fetchone()
    if not org_admin:
        raise HTTPException(status_code=404, detail="No active org_admin found for this org")

    tenant_secret = os.getenv("JWT_SECRET")
    if not tenant_secret:
        tenant_secret = "dev-secret-DO-NOT-USE-IN-PRODUCTION"
    token = jose_jwt.encode(
        {
            "sub": org_admin.id,
            "org_id": org_id,
            "role": "org_admin",
            "impersonated_by": admin.email,
            "exp": datetime.utcnow() + timedelta(hours=1),
        },
        tenant_secret,
        algorithm="HS256",
    )
    _log(admin_db, admin, "impersonate", "org", org_id, f"as user {org_admin.id}")
    return {"access_token": token, "token_type": "bearer", "expires_in": 3600}
