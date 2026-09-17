from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Batch, User
from ..schemas import BatchOut
from ..dependencies import require

router = APIRouter(prefix="/batches", tags=["batches"])


@router.get("", response_model=list[BatchOut])
def list_batches(user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    return db.query(Batch).filter(Batch.organization_id == user.organization_id).all()
