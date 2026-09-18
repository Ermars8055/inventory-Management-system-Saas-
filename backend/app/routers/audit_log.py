"""Org-level audit log — tracks who changed what."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import OrgAuditLog, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/audit-log", tags=["audit-log"])


@router.get("")
def list_audit_log(
    limit: int = Query(100, le=500),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(OrgAuditLog)
        .filter(OrgAuditLog.organization_id == user.organization_id)
        .order_by(OrgAuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id, "userName": l.user_name, "action": l.action,
            "entityType": l.entity_type, "entityId": l.entity_id,
            "detail": l.detail, "createdAt": l.created_at,
        }
        for l in logs
    ]
