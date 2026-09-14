from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_admin_db
from ..models import AdminUser, AuditLog
from ..auth import verify_password, create_token
from ..dependencies import get_current_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["admin-auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_admin_db)):
    admin = db.query(AdminUser).filter(AdminUser.email == body.email).first()
    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not admin.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive")

    admin.last_login = datetime.utcnow().isoformat()
    db.commit()

    token = create_token({"sub": admin.id, "email": admin.email, "role": admin.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "admin": {"id": admin.id, "name": admin.name, "email": admin.email, "role": admin.role},
    }


@router.get("/me")
def me(admin: AdminUser = Depends(get_current_admin)):
    return {"id": admin.id, "name": admin.name, "email": admin.email, "role": admin.role}
