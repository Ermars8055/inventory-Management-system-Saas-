import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Recipient, Assignment, Item
from ..schemas import (
    RecipientOut, RecipientCreate, RecipientUpdate,
    AssignmentOut, AssignmentCreate, ReturnBody, LostBody,
)

router = APIRouter(tags=["issuance"])


# ─── Recipients ─────────────────────────────────────────────────────────────

@router.get("/recipients", response_model=list[RecipientOut])
def list_recipients(org_id: str = Query(...), db: Session = Depends(get_db)):
    return db.query(Recipient).filter(Recipient.organization_id == org_id).all()


@router.post("/recipients", response_model=RecipientOut, status_code=201)
def create_recipient(body: RecipientCreate, db: Session = Depends(get_db)):
    r = Recipient(
        id=f"rec_{int(time.time() * 1000)}",
        **body.model_dump(by_alias=False),
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.get("/recipients/{recipient_id}", response_model=RecipientOut)
def get_recipient(recipient_id: str, db: Session = Depends(get_db)):
    r = db.query(Recipient).filter(Recipient.id == recipient_id).first()
    if not r:
        raise HTTPException(404, "Recipient not found")
    return r


@router.put("/recipients/{recipient_id}", response_model=RecipientOut)
def update_recipient(recipient_id: str, body: RecipientUpdate, db: Session = Depends(get_db)):
    r = db.query(Recipient).filter(Recipient.id == recipient_id).first()
    if not r:
        raise HTTPException(404, "Recipient not found")
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/recipients/{recipient_id}", status_code=204)
def delete_recipient(recipient_id: str, db: Session = Depends(get_db)):
    r = db.query(Recipient).filter(Recipient.id == recipient_id).first()
    if not r:
        raise HTTPException(404, "Recipient not found")
    db.delete(r)
    db.commit()


@router.get("/recipients/{recipient_id}/assignments", response_model=list[AssignmentOut])
def get_recipient_assignments(
    recipient_id: str,
    org_id: str = Query(...),
    db: Session = Depends(get_db),
):
    return (
        db.query(Assignment)
        .filter(
            Assignment.organization_id == org_id,
            Assignment.recipient_id == recipient_id,
        )
        .order_by(Assignment.issue_date.desc())
        .all()
    )


# ─── Assignments ────────────────────────────────────────────────────────────

@router.get("/assignments", response_model=list[AssignmentOut])
def list_assignments(org_id: str = Query(...), db: Session = Depends(get_db)):
    return (
        db.query(Assignment)
        .filter(Assignment.organization_id == org_id)
        .order_by(Assignment.issue_date.desc())
        .all()
    )


@router.post("/assignments", response_model=AssignmentOut, status_code=201)
def create_assignment(body: AssignmentCreate, db: Session = Depends(get_db)):
    a = Assignment(
        id=f"asgn_{int(time.time() * 1000)}",
        **body.model_dump(by_alias=False),
        status="issued",
    )
    db.add(a)
    # Deduct stock from item
    item = db.query(Item).filter(Item.id == body.item_id).first()
    if item:
        item.quantity = max(0, item.quantity - body.quantity)
        item.available = max(0, item.quantity - item.reserved)
        from ..routers.inventory import _compute_status
        item.status = _compute_status(item.quantity)
        from datetime import date as _date
        item.last_updated = _date.today().isoformat()
    db.commit()
    db.refresh(a)
    return a


@router.get("/assignments/{assignment_id}", response_model=AssignmentOut)
def get_assignment(assignment_id: str, db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    return a


@router.patch("/assignments/{assignment_id}/return", response_model=AssignmentOut)
def return_assignment(assignment_id: str, body: ReturnBody, db: Session = Depends(get_db)):
    """
    Return an item. Condition and damage info determine the new status:
    - Good → returned
    - Damaged/Heavily Damaged + fine > 0 → fine_pending
    - Damaged/Heavily Damaged + no fine  → returned_damaged
    """
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")

    a.condition_returned = body.condition_returned
    a.damage_notes = body.damage_notes
    a.fine_amount = body.fine_amount
    a.received_by = body.received_by
    a.return_date = date.today().isoformat()
    if body.notes:
        a.notes = body.notes

    if body.condition_returned == "Good":
        a.status = "returned"
    elif body.fine_amount and body.fine_amount > 0:
        a.status = "fine_pending"
    else:
        a.status = "returned_damaged"

    # Return stock to item
    item = db.query(Item).filter(Item.id == a.item_id).first()
    if item:
        item.quantity = item.quantity + a.quantity
        item.available = max(0, item.quantity - item.reserved)
        from ..routers.inventory import _compute_status
        item.status = _compute_status(item.quantity)
        item.last_updated = date.today().isoformat()

    db.commit()
    db.refresh(a)
    return a


@router.patch("/assignments/{assignment_id}/lost", response_model=AssignmentOut)
def mark_lost(assignment_id: str, body: LostBody, db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    a.status = "fine_pending" if body.fine_amount else "lost"
    a.fine_amount = body.fine_amount
    a.condition_returned = "Lost"
    a.return_date = date.today().isoformat()
    if body.notes:
        a.notes = body.notes
    db.commit()
    db.refresh(a)
    return a


@router.patch("/assignments/{assignment_id}/fine-paid", response_model=AssignmentOut)
def mark_fine_paid(assignment_id: str, db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    a.fine_paid = True
    a.status = "fine_paid"
    db.commit()
    db.refresh(a)
    return a
