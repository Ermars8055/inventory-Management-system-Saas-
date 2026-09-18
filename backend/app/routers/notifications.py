"""In-app notification system."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Notification, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    limit: int = Query(50, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifs = (
        db.query(Notification)
        .filter(
            Notification.organization_id == user.organization_id,
            (Notification.user_id == user.id) | (Notification.user_id == None),
        )
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": n.id, "type": n.type, "title": n.title,
            "message": n.message, "read": n.read, "createdAt": n.created_at,
        }
        for n in notifs
    ]


@router.get("/unread-count")
def unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = (
        db.query(Notification)
        .filter(
            Notification.organization_id == user.organization_id,
            (Notification.user_id == user.id) | (Notification.user_id == None),
            Notification.read == False,
        )
        .count()
    )
    return {"count": count}


@router.patch("/{notif_id}/read")
def mark_read(notif_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if n:
        n.read = True
        db.commit()
    return {"ok": True}


@router.patch("/read-all")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.organization_id == user.organization_id,
        (Notification.user_id == user.id) | (Notification.user_id == None),
        Notification.read == False,
    ).update({"read": True})
    db.commit()
    return {"ok": True}


def create_notification(db: Session, org_id: str, type: str, title: str, message: str = "", user_id: str = None):
    """Helper to create a notification from any route."""
    db.add(Notification(
        id=str(uuid.uuid4()),
        organization_id=org_id,
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        read=False,
        created_at=datetime.utcnow().isoformat(),
    ))
