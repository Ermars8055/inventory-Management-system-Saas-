from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_admin_db
from ..models import AdminUser, AuditLog
from ..auth import hash_password
from ..dependencies import require, get_current_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/admin-users", tags=["admin-users"])


@router.get("")
def list_admins(
    admin: AdminUser = Depends(require("admin_users:read")),
    db: Session = Depends(get_admin_db),
):
    users = db.query(AdminUser).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "isActive": u.is_active, "lastLogin": u.last_login} for u in users]


class CreateAdmin(BaseModel):
    name: str
    email: str
    password: str
    role: str = "support"


@router.post("")
def create_admin(
    body: CreateAdmin,
    admin: AdminUser = Depends(require("admin_users:manage")),
    db: Session = Depends(get_admin_db),
):
    if db.query(AdminUser).filter(AdminUser.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    new_admin = AdminUser(
        id=str(uuid.uuid4()),
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=True,
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(new_admin)
    db.add(AuditLog(
        id=str(uuid.uuid4()),
        admin_id=admin.id,
        admin_email=admin.email,
        action="create_admin_user",
        target_type="admin_user",
        target_id=new_admin.id,
        detail=f"{body.email} ({body.role})",
        created_at=datetime.utcnow().isoformat(),
    ))
    db.commit()
    return {"id": new_admin.id, "name": new_admin.name, "email": new_admin.email, "role": new_admin.role}


@router.patch("/{user_id}/deactivate")
def deactivate(
    user_id: str,
    admin: AdminUser = Depends(require("admin_users:manage")),
    db: Session = Depends(get_admin_db),
):
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    user.is_active = False
    db.commit()
    return {"ok": True}
