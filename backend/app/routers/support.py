import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import create_engine, text
from ..models import User, Organization
from ..database import get_db
from sqlalchemy.orm import Session
from ..dependencies import get_current_user

router = APIRouter(prefix="/support", tags=["support"])


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CreateTicketBody(_Camel):
    subject: str
    description: str = ""
    priority: str = "medium"


class ReplyBody(_Camel):
    message: str


def _admin_engine():
    url = os.getenv("ADMIN_DB_URL", "sqlite:////data/admin.db")
    kwargs = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=kwargs)


@router.get("/tickets")
def my_tickets(user: User = Depends(get_current_user)):
    engine = _admin_engine()
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT * FROM support_tickets WHERE org_id = :oid ORDER BY created_at DESC"
        ), {"oid": user.organization_id}).fetchall()
    return [
        {
            "id": r.id, "subject": r.subject, "status": r.status,
            "priority": r.priority, "createdAt": r.created_at,
            "resolvedAt": r.resolved_at,
        }
        for r in rows
    ]


@router.post("/tickets")
def create_ticket(body: CreateTicketBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    engine = _admin_engine()
    ticket_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO support_tickets (id, org_id, org_name, subject, description, status, priority, submitted_by, submitted_by_email, created_at)
            VALUES (:id, :oid, :oname, :subject, :desc, 'open', :priority, :uname, :uemail, :now)
        """), {
            "id": ticket_id, "oid": user.organization_id,
            "oname": org.name if org else "", "subject": body.subject,
            "desc": body.description, "priority": body.priority,
            "uname": user.name, "uemail": user.email, "now": now,
        })
        conn.commit()
    return {"id": ticket_id, "subject": body.subject}


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, user: User = Depends(get_current_user)):
    engine = _admin_engine()
    with engine.connect() as conn:
        t = conn.execute(text(
            "SELECT * FROM support_tickets WHERE id = :id AND org_id = :oid"
        ), {"id": ticket_id, "oid": user.organization_id}).fetchone()
        if not t:
            raise HTTPException(404, "Ticket not found")
        messages = conn.execute(text(
            "SELECT * FROM ticket_messages WHERE ticket_id = :tid ORDER BY created_at"
        ), {"tid": ticket_id}).fetchall()
    return {
        "id": t.id, "subject": t.subject, "description": t.description,
        "status": t.status, "priority": t.priority, "createdAt": t.created_at,
        "messages": [
            {"id": m.id, "senderType": m.sender_type, "senderName": m.sender_name, "message": m.message, "createdAt": m.created_at}
            for m in messages
        ],
    }


@router.post("/tickets/{ticket_id}/reply")
def tenant_reply(ticket_id: str, body: ReplyBody, user: User = Depends(get_current_user)):
    engine = _admin_engine()
    with engine.connect() as conn:
        t = conn.execute(text(
            "SELECT id FROM support_tickets WHERE id = :id AND org_id = :oid"
        ), {"id": ticket_id, "oid": user.organization_id}).fetchone()
        if not t:
            raise HTTPException(404, "Ticket not found")
        conn.execute(text("""
            INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_name, sender_email, message, created_at)
            VALUES (:id, :tid, 'tenant', :name, :email, :msg, :now)
        """), {
            "id": str(uuid.uuid4()), "tid": ticket_id,
            "name": user.name, "email": user.email,
            "msg": body.message, "now": datetime.utcnow().isoformat(),
        })
        conn.commit()
    return {"ok": True}
