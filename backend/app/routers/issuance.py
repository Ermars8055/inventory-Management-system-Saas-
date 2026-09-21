import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Recipient, Assignment, Item, User, Organization
from ..schemas import (
    RecipientOut, RecipientCreate, RecipientUpdate,
    AssignmentOut, AssignmentCreate, ReturnBody, LostBody,
)
from ..dependencies import require, same_org

router = APIRouter(tags=["issuance"])


# ─── Recipients ─────────────────────────────────────────────────────────────

@router.get("/recipients", response_model=list[RecipientOut])
def list_recipients(user: User = Depends(require("recipients:read")), db: Session = Depends(get_db)):
    return db.query(Recipient).filter(Recipient.organization_id == user.organization_id).all()


@router.post("/recipients", response_model=RecipientOut, status_code=201)
def create_recipient(body: RecipientCreate, user: User = Depends(require("recipients:create")), db: Session = Depends(get_db)):
    r = Recipient(
        id=f"rec_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        name=body.name,
        identifier=body.identifier,
        group=body.group,
        contact=body.contact,
        extra_data=body.extra_data,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.get("/recipients/{recipient_id}", response_model=RecipientOut)
def get_recipient(recipient_id: str, user: User = Depends(require("recipients:read")), db: Session = Depends(get_db)):
    r = db.query(Recipient).filter(Recipient.id == recipient_id).first()
    if not r:
        raise HTTPException(404, "Recipient not found")
    same_org(r.organization_id, user)
    return r


@router.put("/recipients/{recipient_id}", response_model=RecipientOut)
def update_recipient(recipient_id: str, body: RecipientUpdate, user: User = Depends(require("recipients:update")), db: Session = Depends(get_db)):
    r = db.query(Recipient).filter(Recipient.id == recipient_id).first()
    if not r:
        raise HTTPException(404, "Recipient not found")
    same_org(r.organization_id, user)
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/recipients/{recipient_id}", status_code=204)
def delete_recipient(recipient_id: str, user: User = Depends(require("recipients:delete")), db: Session = Depends(get_db)):
    r = db.query(Recipient).filter(Recipient.id == recipient_id).first()
    if not r:
        raise HTTPException(404, "Recipient not found")
    same_org(r.organization_id, user)
    db.delete(r)
    db.commit()


@router.get("/recipients/{recipient_id}/assignments", response_model=list[AssignmentOut])
def get_recipient_assignments(recipient_id: str, user: User = Depends(require("assignments:read")), db: Session = Depends(get_db)):
    return (
        db.query(Assignment)
        .filter(
            Assignment.organization_id == user.organization_id,
            Assignment.recipient_id == recipient_id,
        )
        .order_by(Assignment.issue_date.desc())
        .all()
    )


# ─── Assignments ────────────────────────────────────────────────────────────

@router.get("/assignments", response_model=list[AssignmentOut])
def list_assignments(user: User = Depends(require("assignments:read")), db: Session = Depends(get_db)):
    return (
        db.query(Assignment)
        .filter(Assignment.organization_id == user.organization_id)
        .order_by(Assignment.issue_date.desc())
        .all()
    )


@router.post("/assignments", response_model=AssignmentOut, status_code=201)
def create_assignment(body: AssignmentCreate, user: User = Depends(require("assignments:create")), db: Session = Depends(get_db)):
    # Determine mode from org config
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    org_config = org.config or {} if org else {}
    mode = body.mode or org_config.get("assignmentMode", "distribution")
    is_distribution = mode == "distribution"

    fee_amount = body.unit_price * body.quantity if body.unit_price else 0

    a = Assignment(
        id=f"asgn_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        recipient_id=body.recipient_id,
        recipient_name=body.recipient_name,
        recipient_identifier=body.recipient_identifier,
        recipient_group=body.recipient_group,
        item_id=body.item_id,
        item_name=body.item_name,
        item_details=body.item_details,
        quantity=body.quantity,
        condition_issued=body.condition_issued,
        issue_date=body.issue_date,
        expected_return=body.expected_return if not is_distribution else None,
        issued_by=body.issued_by,
        notes=body.notes,
        mode=mode,
        status="distributed" if is_distribution else "issued",
        unit_price=body.unit_price,
        fee_amount=fee_amount,
        fee_status="unpaid" if fee_amount > 0 else "waived",
    )
    db.add(a)
    item = db.query(Item).filter(Item.id == body.item_id).first()
    if item:
        same_org(item.organization_id, user)
        if is_distribution:
            # Distribution: reduce stock permanently (sold/given, not coming back)
            item.quantity = max(0, item.quantity - body.quantity)
            item.available = max(0, item.quantity - (item.reserved or 0))
        else:
            # Lending: reserve stock (will come back on return)
            item.reserved = (item.reserved or 0) + body.quantity
            item.available = max(0, item.quantity - item.reserved)
        from ..routers.inventory import _compute_status
        item.status = _compute_status(item.available, item.min_quantity or 10)
        item.last_updated = date.today().isoformat()
    db.commit()
    db.refresh(a)
    return a


@router.get("/assignments/{assignment_id}", response_model=AssignmentOut)
def get_assignment(assignment_id: str, user: User = Depends(require("assignments:read")), db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    same_org(a.organization_id, user)
    return a


@router.patch("/assignments/{assignment_id}/return", response_model=AssignmentOut)
def return_assignment(assignment_id: str, body: ReturnBody, user: User = Depends(require("assignments:update")), db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    same_org(a.organization_id, user)

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

    item = db.query(Item).filter(Item.id == a.item_id).first()
    if item:
        item.reserved = max(0, (item.reserved or 0) - a.quantity)
        item.available = max(0, item.quantity - item.reserved)
        from ..routers.inventory import _compute_status
        item.status = _compute_status(item.available, item.min_quantity or 10)
        item.last_updated = date.today().isoformat()

    db.commit()
    db.refresh(a)
    return a


@router.patch("/assignments/{assignment_id}/lost", response_model=AssignmentOut)
def mark_lost(assignment_id: str, body: LostBody, user: User = Depends(require("assignments:update")), db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    same_org(a.organization_id, user)
    a.status = "fine_pending" if body.fine_amount else "lost"
    a.fine_amount = body.fine_amount
    a.condition_returned = "Lost"
    a.return_date = date.today().isoformat()
    if body.notes:
        a.notes = body.notes
    item = db.query(Item).filter(Item.id == a.item_id).first()
    if item:
        item.quantity = max(0, item.quantity - a.quantity)
        item.reserved = max(0, (item.reserved or 0) - a.quantity)
        item.available = max(0, item.quantity - item.reserved)
        from ..routers.inventory import _compute_status
        item.status = _compute_status(item.available, item.min_quantity or 10)
        item.last_updated = date.today().isoformat()
    db.commit()
    db.refresh(a)
    return a


@router.patch("/assignments/{assignment_id}/fine-paid", response_model=AssignmentOut)
def mark_fine_paid(assignment_id: str, user: User = Depends(require("assignments:update")), db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    same_org(a.organization_id, user)
    a.fine_paid = True
    a.status = "fine_paid"
    db.commit()
    db.refresh(a)
    return a


@router.patch("/assignments/{assignment_id}/fee-paid", response_model=AssignmentOut)
def mark_fee_paid(assignment_id: str, user: User = Depends(require("assignments:update")), db: Session = Depends(get_db)):
    """Mark fee as paid for a distributed item."""
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Assignment not found")
    same_org(a.organization_id, user)
    a.fee_status = "paid"
    db.commit()
    db.refresh(a)
    return a
