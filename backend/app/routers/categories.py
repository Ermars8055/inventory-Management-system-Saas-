import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Category, User
from ..schemas import CategoryOut, CategoryCreate
from ..dependencies import require, same_org

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.organization_id == user.organization_id).all()


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(body: CategoryCreate, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    cat = Category(
        id=f"cat_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        name=body.name,
        color=body.color,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{cat_id}", status_code=204)
def delete_category(cat_id: str, user: User = Depends(require("inventory:delete")), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    same_org(cat.organization_id, user)
    db.delete(cat)
    db.commit()
