"""Org-level audit log — tracks who changed what."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import OrgAuditLog, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/audit-log", tags=["audit-log"])


@router.get("")
def list_audit_log(
    limit: int = Query(500, le=2000),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(OrgAuditLog)
        .filter(OrgAuditLog.organization_id == user.organization_id)
    )
    if entity_type:
        query = query.filter(OrgAuditLog.entity_type == entity_type)
    if action:
        query = query.filter(OrgAuditLog.action == action)
    if date_from:
        query = query.filter(OrgAuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(OrgAuditLog.created_at <= date_to + "T23:59:59")
    if user_name:
        query = query.filter(OrgAuditLog.user_name.like(f"%{user_name}%"))
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            OrgAuditLog.detail.like(like),
            OrgAuditLog.user_name.like(like),
            OrgAuditLog.entity_id.like(like),
        ))
    logs = query.order_by(OrgAuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "userId": l.user_id,
            "userName": l.user_name,
            "action": l.action,
            "entityType": l.entity_type,
            "entityId": l.entity_id,
            "detail": l.detail,
            "createdAt": l.created_at,
        }
        for l in logs
    ]
