import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from ..database import get_admin_db
from ..models import SupportTicket, TicketMessage, AdminUser
from ..dependencies import require

router = APIRouter(prefix="/support", tags=["admin-support"])


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ReplyBody(_Camel):
    message: str


class UpdateTicket(_Camel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None


# ─── Admin views ─────────────────────────────────────────────────────────────

@router.get("")
def list_tickets(admin: AdminUser = Depends(require("orgs:read")), db: Session = Depends(get_admin_db)):
    tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).limit(200).all()
    return [
        {
            "id": t.id, "orgId": t.org_id, "orgName": t.org_name,
            "subject": t.subject, "description": t.description,
            "status": t.status, "priority": t.priority,
            "submittedBy": t.submitted_by, "submittedByEmail": t.submitted_by_email,
            "assignedTo": t.assigned_to,
            "createdAt": t.created_at, "resolvedAt": t.resolved_at,
        }
        for t in tickets
    ]


@router.get("/{ticket_id}")
def get_ticket(ticket_id: str, admin: AdminUser = Depends(require("orgs:read")), db: Session = Depends(get_admin_db)):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    messages = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket_id).order_by(TicketMessage.created_at).all()
    return {
        "id": t.id, "orgId": t.org_id, "orgName": t.org_name,
        "subject": t.subject, "description": t.description,
        "status": t.status, "priority": t.priority,
        "submittedBy": t.submitted_by, "assignedTo": t.assigned_to,
        "createdAt": t.created_at, "resolvedAt": t.resolved_at,
        "messages": [
            {"id": m.id, "senderType": m.sender_type, "senderName": m.sender_name, "message": m.message, "createdAt": m.created_at}
            for m in messages
        ],
    }


@router.patch("/{ticket_id}")
def update_ticket(ticket_id: str, body: UpdateTicket, admin: AdminUser = Depends(require("orgs:read")), db: Session = Depends(get_admin_db)):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(t, field, value)
    if body.status in ("resolved", "closed") and not t.resolved_at:
        t.resolved_at = datetime.utcnow().isoformat()
    db.commit()
    return {"ok": True}


@router.post("/{ticket_id}/reply")
def admin_reply(ticket_id: str, body: ReplyBody, admin: AdminUser = Depends(require("orgs:read")), db: Session = Depends(get_admin_db)):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    db.add(TicketMessage(
        id=str(uuid.uuid4()),
        ticket_id=ticket_id,
        sender_type="admin",
        sender_name=admin.name,
        sender_email=admin.email,
        message=body.message,
        created_at=datetime.utcnow().isoformat(),
    ))
    if t.status == "open":
        t.status = "in_progress"
    db.commit()
    return {"ok": True}
