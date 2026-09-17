import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import MaintenanceTicket, User
from ..schemas import MaintenanceTicketOut, MaintenanceTicketCreate, MaintenanceTicketUpdate
from ..dependencies import require, same_org

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def _next_ticket_id(db: Session, org_id: str) -> str:
    year = date.today().year
    count = db.query(MaintenanceTicket).filter(MaintenanceTicket.organization_id == org_id).count()
    return f"MNT-{year}-{str(count + 1).zfill(4)}"


@router.get("", response_model=list[MaintenanceTicketOut])
def list_tickets(user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    return (
        db.query(MaintenanceTicket)
        .filter(MaintenanceTicket.organization_id == user.organization_id)
        .order_by(MaintenanceTicket.created_at.desc())
        .all()
    )


@router.post("", response_model=MaintenanceTicketOut, status_code=201)
def create_ticket(body: MaintenanceTicketCreate, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    ticket_id = _next_ticket_id(db, user.organization_id)
    reported_date = body.reported_date or date.today().isoformat()
    t = MaintenanceTicket(
        id=f"mnt_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        ticket_id=ticket_id,
        asset=body.asset,
        issue=body.issue,
        reported_by=body.reported_by,
        assigned_to=body.assigned_to,
        priority=body.priority,
        status=body.status,
        reported_date=reported_date,
        notes=body.notes,
        created_at=date.today().isoformat(),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/{ticket_id}", response_model=MaintenanceTicketOut)
def update_ticket(ticket_id: str, body: MaintenanceTicketUpdate, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    t = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    same_org(t.organization_id, user)
    data = body.model_dump(exclude_none=True, by_alias=False)
    if data.get("status") in ("resolved", "closed") and not t.resolved_date:
        data.setdefault("resolved_date", date.today().isoformat())
    for field, value in data.items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(ticket_id: str, user: User = Depends(require("inventory:delete")), db: Session = Depends(get_db)):
    t = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    same_org(t.organization_id, user)
    db.delete(t)
    db.commit()
