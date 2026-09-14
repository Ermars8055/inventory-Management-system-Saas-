from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_admin_db
from ..models import AuditLog, AdminUser
from ..dependencies import require

router = APIRouter(prefix="/audit", tags=["admin-audit"])


@router.get("")
def list_audit(
    admin: AdminUser = Depends(require("audit:read")),
    db: Session = Depends(get_admin_db),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return [
        {
            "id": l.id,
            "adminEmail": l.admin_email,
            "action": l.action,
            "targetType": l.target_type,
            "targetId": l.target_id,
            "detail": l.detail,
            "createdAt": l.created_at,
        }
        for l in logs
    ]
