"""Audit logging helper — call from routes after write operations."""
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from .models import OrgAuditLog, User


def log_action(
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: str = "",
    detail: str = "",
    before: dict | None = None,
    after: dict | None = None,
):
    """Log a user-initiated action, optionally with before/after values.

    When *before* and *after* are supplied, only changed fields are recorded
    so the detail field gives a useful diff: ``field: old → new``.
    """
    full_detail = detail
    changes = _diff(before, after)
    if changes:
        full_detail = (detail + "\n" + "; ".join(changes)).strip()
    db.add(OrgAuditLog(
        id=str(uuid.uuid4()),
        organization_id=user.organization_id,
        user_id=user.id,
        user_name=user.name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=full_detail,
        created_at=datetime.utcnow().isoformat(),
    ))


def log_system(
    db: Session,
    org_id: str,
    action: str,
    entity_type: str,
    entity_id: str = "",
    detail: str = "",
):
    """Log a system-level event without a specific user (e.g. failed login)."""
    db.add(OrgAuditLog(
        id=str(uuid.uuid4()),
        organization_id=org_id,
        user_id=None,
        user_name="System",
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
        created_at=datetime.utcnow().isoformat(),
    ))


def _diff(before: dict | None, after: dict | None) -> list[str]:
    """Return human-readable list of changed fields only."""
    if before is None and after is None:
        return []
    if before is None:
        return [f"{k}: {_fmt(v)}" for k, v in (after or {}).items()]
    if after is None:
        return [f"{k}: {_fmt(v)}" for k, v in (before or {}).items()]
    changes = []
    for k in sorted(set(list(before.keys()) + list(after.keys()))):
        bv = before.get(k)
        av = after.get(k)
        if bv != av:
            changes.append(f"{k}: {_fmt(bv)} → {_fmt(av)}")
    return changes


def _fmt(v) -> str:
    if v is None:
        return "—"
    return str(v)
