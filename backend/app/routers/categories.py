from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Category, User
from ..schemas import CategoryOut
from ..dependencies import require

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.organization_id == user.organization_id).all()
