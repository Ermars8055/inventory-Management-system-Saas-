import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role
from ..schemas import UserOut, RoleOut, UserCreate, UserUpdate
from ..dependencies import require, same_org, get_current_user
from ..auth import hash_password

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserOut])
def list_users(user: User = Depends(require("users:read")), db: Session = Depends(get_db)):
    return db.query(User).filter(User.organization_id == user.organization_id).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    same_org(body.organization_id, user)
    existing = db.query(User).filter(
        User.organization_id == user.organization_id,
        User.email == body.email,
    ).first()
    if existing:
        raise HTTPException(409, "A user with this email already exists in this organization")
    new_user = User(
        id=f"usr_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password) if body.password else hash_password("changeme"),
        role=body.role,
        status="active",
        last_active=None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: str, body: UserUpdate, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    same_org(target.organization_id, user)
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(target, field, value)
    db.commit()
    db.refresh(target)
    return target


@router.patch("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: str, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    same_org(target.organization_id, user)
    if target.id == user.id:
        raise HTTPException(400, "Cannot deactivate yourself")
    target.status = "inactive"
    db.commit()
    db.refresh(target)
    return target


@router.patch("/users/{user_id}/activate", response_model=UserOut)
def activate_user(user_id: str, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    same_org(target.organization_id, user)
    target.status = "active"
    db.commit()
    db.refresh(target)
    return target


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    same_org(target.organization_id, user)
    if target.id == user.id:
        raise HTTPException(400, "Cannot delete yourself")
    if target.role == "org_admin":
        admin_count = db.query(User).filter(
            User.organization_id == user.organization_id,
            User.role == "org_admin",
            User.status == "active",
        ).count()
        if admin_count <= 1:
            raise HTTPException(400, "Cannot delete the last organization admin")
    db.delete(target)
    db.commit()


@router.get("/roles", response_model=list[RoleOut])
def list_roles(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Role).all()
