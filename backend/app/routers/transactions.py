import time
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import StockTransaction, User
from ..schemas import TransactionOut, TransactionCreate
from ..dependencies import require

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    item_id: Optional[str] = Query(None),
    user: User = Depends(require("transactions:read")),
    db: Session = Depends(get_db),
):
    q = db.query(StockTransaction).filter(StockTransaction.organization_id == user.organization_id)
    if item_id:
        q = q.filter(StockTransaction.item_id == item_id)
    return q.order_by(StockTransaction.date.desc()).all()


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(body: TransactionCreate, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    tx = StockTransaction(
        id=f"tx_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        date=body.date,
        item_id=body.item_id,
        item_name=body.item_name,
        type=body.type,
        quantity=body.quantity,
        user=body.user,
        reference=body.reference,
        recipient=body.recipient,
        recipient_class=body.recipient_class,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx
