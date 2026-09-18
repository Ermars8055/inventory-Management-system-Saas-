"""Audit logging helper — call from routes after write operations."""
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from .models import OrgAuditLog, User


def log_action(db: Session, user: User, action: str, entity_type: str, entity_id: str = "", detail: str = ""):
    db.add(OrgAuditLog(
        id=str(uuid.uuid4()),
        organization_id=user.organization_id,
        user_id=user.id,
        user_name=user.name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
        created_at=datetime.utcnow().isoformat(),
    ))
