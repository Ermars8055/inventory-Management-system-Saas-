import uuid
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import SessionLocal
from ..models import User, Organization, PasswordResetToken
from ..auth import verify_password, create_access_token, hash_password, blacklist_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..dependencies import get_db, get_current_user
from ..email_service import send_password_reset

router = APIRouter(prefix="/auth", tags=["auth"])

APP_URL = os.getenv("APP_URL", "https://stockpilot.ermarscastar.in")


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive")

    # If login is on a subdomain, verify user belongs to that org
    subdomain_org_id = getattr(request.state, "subdomain_org_id", None)
    if subdomain_org_id and user.organization_id != subdomain_org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account does not belong to this organization")

    token = create_access_token({
        "sub": user.id,
        "org_id": user.organization_id,
        "role": user.role,
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "organizationId": user.organization_id,
        },
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "organizationId": current_user.organization_id,
    }


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset email. Always returns 200 to prevent email enumeration."""
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        # Invalidate old tokens
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
        ).update({"used": True})

        token = str(uuid.uuid4())
        db.add(PasswordResetToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token=token,
            expires_at=(datetime.utcnow() + timedelta(hours=1)).isoformat(),
            used=False,
            created_at=datetime.utcnow().isoformat(),
        ))
        db.commit()

        # Build reset URL — use org's subdomain if available
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        if org and org.subdomain:
            base = f"https://{org.subdomain}.stockpilot.ermarscastar.in"
        else:
            base = APP_URL
        reset_url = f"{base}/reset-password?token={token}"

        send_password_reset(user.email, user.name, reset_url)

    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Validate reset token and set new password."""
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == body.token,
        PasswordResetToken.used == False,
    ).first()

    if not reset:
        raise HTTPException(400, "Invalid or expired reset link")

    if datetime.utcnow().isoformat() > reset.expires_at:
        raise HTTPException(400, "Reset link has expired")

    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    user.password_hash = hash_password(body.password)
    reset.used = True
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}


@router.post("/change-password")
def change_password(body: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Change password for logged-in user."""
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")

    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


_bearer = HTTPBearer(auto_error=False)


@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)):
    """Blacklist the current token so it can't be reused."""
    if credentials:
        blacklist_token(credentials.credentials)
    return {"message": "Logged out"}
