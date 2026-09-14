import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role
from ..schemas import UserOut, RoleOut, UserCreate, UserUpdate

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserOut])
def list_users(org_id: str = Query(...), db: Session = Depends(get_db)):
    return db.query(User).filter(User.organization_id == org_id).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        User.organization_id == body.organization_id,
        User.email == body.email,
    ).first()
    if existing:
        raise HTTPException(409, "A user with this email already exists in this organization")
    user = User(
        id=f"usr_{int(time.time() * 1000)}",
        organization_id=body.organization_id,
        name=body.name,
        email=body.email,
        role=body.role,
        status="active",
        last_active=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: str, body: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.status = "inactive"
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/activate", response_model=UserOut)
def activate_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.status = "active"
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()


@router.get("/roles", response_model=list[RoleOut])
def list_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()
