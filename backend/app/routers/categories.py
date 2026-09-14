from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Category
from ..schemas import CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(org_id: str = Query(...), db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.organization_id == org_id).all()
