from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Batch
from ..schemas import BatchOut

router = APIRouter(prefix="/batches", tags=["batches"])


@router.get("", response_model=list[BatchOut])
def list_batches(org_id: str = Query(...), db: Session = Depends(get_db)):
    return db.query(Batch).filter(Batch.organization_id == org_id).all()
