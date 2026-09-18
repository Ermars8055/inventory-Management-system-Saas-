"""API Keys + Webhooks management for org integrations."""
import uuid, hashlib, secrets, hmac, json, os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
import requests as http_requests
from ..database import get_db
from ..models import ApiKey, Webhook, User
from ..dependencies import require, same_org

router = APIRouter(tags=["settings"])


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ─── API Keys ────────────────────────────────────────────────────────────────

class CreateKeyBody(_Camel):
    name: str


@router.get("/settings/api-keys")
def list_keys(user: User = Depends(require("settings:read")), db: Session = Depends(get_db)):
    keys = db.query(ApiKey).filter(ApiKey.organization_id == user.organization_id, ApiKey.is_active == True).all()
    return [{"id": k.id, "name": k.name, "lastUsed": k.last_used, "createdAt": k.created_at,
             "keyPreview": f"sk_...{k.key_hash[-8:]}"} for k in keys]


@router.post("/settings/api-keys")
def create_key(body: CreateKeyBody, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    raw_key = f"sk_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    k = ApiKey(
        id=str(uuid.uuid4()), organization_id=user.organization_id,
        key_hash=key_hash, name=body.name, is_active=True,
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(k)
    db.commit()
    return {"id": k.id, "key": raw_key, "name": k.name}


@router.delete("/settings/api-keys/{key_id}", status_code=204)
def revoke_key(key_id: str, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    k = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not k:
        raise HTTPException(404, "Key not found")
    same_org(k.organization_id, user)
    k.is_active = False
    db.commit()


# ─── Webhooks ────────────────────────────────────────────────────────────────

class WebhookBody(_Camel):
    event: str
    url: str


WEBHOOK_EVENTS = ["item.low_stock", "order.received", "assignment.created", "invoice.paid"]


@router.get("/settings/webhooks")
def list_webhooks(user: User = Depends(require("settings:read")), db: Session = Depends(get_db)):
    hooks = db.query(Webhook).filter(Webhook.organization_id == user.organization_id, Webhook.is_active == True).all()
    return [{"id": h.id, "event": h.event, "url": h.url, "createdAt": h.created_at} for h in hooks]


@router.post("/settings/webhooks")
def create_webhook(body: WebhookBody, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    if body.event not in WEBHOOK_EVENTS:
        raise HTTPException(400, f"Invalid event. Valid: {', '.join(WEBHOOK_EVENTS)}")
    secret = secrets.token_urlsafe(24)
    h = Webhook(
        id=str(uuid.uuid4()), organization_id=user.organization_id,
        event=body.event, url=body.url, secret=secret, is_active=True,
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(h)
    db.commit()
    return {"id": h.id, "event": h.event, "url": h.url, "secret": secret}


@router.delete("/settings/webhooks/{hook_id}", status_code=204)
def delete_webhook(hook_id: str, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    h = db.query(Webhook).filter(Webhook.id == hook_id).first()
    if not h:
        raise HTTPException(404, "Webhook not found")
    same_org(h.organization_id, user)
    h.is_active = False
    db.commit()


@router.get("/settings/webhook-events")
def list_events(user: User = Depends(require("settings:read"))):
    return WEBHOOK_EVENTS


def fire_webhooks(db: Session, org_id: str, event: str, payload: dict):
    """Call all active webhooks for an org+event. Non-blocking best effort."""
    hooks = db.query(Webhook).filter(
        Webhook.organization_id == org_id, Webhook.event == event, Webhook.is_active == True
    ).all()
    for h in hooks:
        try:
            body = json.dumps(payload)
            sig = hmac.new(h.secret.encode(), body.encode(), hashlib.sha256).hexdigest()
            http_requests.post(h.url, data=body, headers={
                "Content-Type": "application/json",
                "X-StockPilot-Signature": sig,
                "X-StockPilot-Event": event,
            }, timeout=5)
        except Exception:
            pass  # Best effort, don't block the request
