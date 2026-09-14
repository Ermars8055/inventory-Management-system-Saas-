import time
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import StockTransaction
from ..schemas import TransactionOut, TransactionCreate

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    org_id: Optional[str] = Query(None),
    item_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(StockTransaction)
    if org_id:
        q = q.filter(StockTransaction.organization_id == org_id)
    if item_id:
        q = q.filter(StockTransaction.item_id == item_id)
    return q.order_by(StockTransaction.date.desc()).all()


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(body: TransactionCreate, db: Session = Depends(get_db)):
    tx = StockTransaction(
        id=f"tx_{int(time.time() * 1000)}",
        **body.model_dump(by_alias=False),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx
