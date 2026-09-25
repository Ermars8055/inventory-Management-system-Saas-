"""
Class Material Templates — CRUD + bulk-issue endpoint.
"""
import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ClassTemplate, ClassTemplateItem, Recipient, Assignment, Item, User, Organization, StockTransaction, compute_item_status
from ..schemas import (
    ClassTemplateOut, ClassTemplateCreate, ClassTemplateUpdate,
    ClassTemplateItemOut, ClassTemplateItemCreate,
    BulkIssueBody, AssignmentOut,
)
from ..dependencies import require, same_org
from ..audit import log_action

router = APIRouter(prefix="/class-templates", tags=["class_templates"])


# ─── Template CRUD ──────────────────────────────────────────────────────────

@router.get("", response_model=list[ClassTemplateOut])
def list_templates(user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    return (
        db.query(ClassTemplate)
        .filter(ClassTemplate.organization_id == user.organization_id)
        .order_by(ClassTemplate.name)
        .all()
    )


@router.post("", response_model=ClassTemplateOut, status_code=201)
def create_template(body: ClassTemplateCreate, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    tid = f"ct_{int(time.time() * 1000)}"
    t = ClassTemplate(
        id=tid,
        organization_id=user.organization_id,
        name=body.name,
        group=body.group,
        academic_year=body.academic_year,
        notes=body.notes,
        created_at=date.today().isoformat(),
    )
    db.add(t)
    for i, li in enumerate(body.items):
        db.add(ClassTemplateItem(
            id=f"cti_{tid}_{i}_{int(time.time()*1000)}",
            template_id=tid,
            item_id=li.item_id,
            item_name=li.item_name,
            quantity=li.quantity,
            condition_issued=li.condition_issued,
            notes=li.notes,
        ))
    log_action(db, user, "create", "template", tid,
               f"Created template: {body.name} (group={body.group}, year={body.academic_year or '—'}, {len(body.items)} items)")
    db.commit()
    db.refresh(t)
    return t


@router.get("/{template_id}", response_model=ClassTemplateOut)
def get_template(template_id: str, user: User = Depends(require("inventory:read")), db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    same_org(t.organization_id, user)
    return t


@router.put("/{template_id}", response_model=ClassTemplateOut)
def update_template(template_id: str, body: ClassTemplateUpdate, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    same_org(t.organization_id, user)
    changes = body.model_dump(exclude_none=True)
    before = {k: getattr(t, k) for k in changes}
    for field, value in changes.items():
        setattr(t, field, value)
    log_action(db, user, "update", "template", template_id,
               f"Updated template: {t.name}", before=before, after=changes)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, user: User = Depends(require("inventory:delete")), db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    same_org(t.organization_id, user)
    log_action(db, user, "delete", "template", template_id,
               f"Deleted template: {t.name} (group={t.group})")
    db.delete(t)
    db.commit()


# ─── Template Items ──────────────────────────────────────────────────────────

@router.post("/{template_id}/items", response_model=ClassTemplateItemOut, status_code=201)
def add_template_item(template_id: str, body: ClassTemplateItemCreate, user: User = Depends(require("inventory:create")), db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    same_org(t.organization_id, user)
    item = ClassTemplateItem(
        id=f"cti_{int(time.time() * 1000)}",
        template_id=template_id,
        item_id=body.item_id,
        item_name=body.item_name,
        quantity=body.quantity,
        unit_price=body.unit_price,
        condition_issued=body.condition_issued,
        notes=body.notes,
    )
    db.add(item)
    log_action(db, user, "add_item", "template", template_id,
               f"Added item to '{t.name}': {body.item_name} ×{body.quantity} @ ₹{body.unit_price}")
    db.commit()
    db.refresh(item)
    return item


@router.put("/{template_id}/items/{item_id}", response_model=ClassTemplateItemOut)
def update_template_item(template_id: str, item_id: str, body: ClassTemplateItemCreate, user: User = Depends(require("inventory:update")), db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    same_org(t.organization_id, user)
    ti = (
        db.query(ClassTemplateItem)
        .filter(ClassTemplateItem.id == item_id, ClassTemplateItem.template_id == template_id)
        .first()
    )
    if not ti:
        raise HTTPException(404, "Item not found")
    changes = body.model_dump(exclude_none=True)
    before = {k: getattr(ti, k) for k in changes}
    for field, value in changes.items():
        setattr(ti, field, value)
    log_action(db, user, "update_item", "template", template_id,
               f"Updated item in '{t.name}': {ti.item_name}", before=before, after=changes)
    db.commit()
    db.refresh(ti)
    return ti


@router.delete("/{template_id}/items/{item_id}", status_code=204)
def delete_template_item(template_id: str, item_id: str, user: User = Depends(require("inventory:delete")), db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    same_org(t.organization_id, user)
    ti = (
        db.query(ClassTemplateItem)
        .filter(ClassTemplateItem.id == item_id, ClassTemplateItem.template_id == template_id)
        .first()
    )
    if not ti:
        raise HTTPException(404, "Item not found")
    log_action(db, user, "remove_item", "template", template_id,
               f"Removed item from '{t.name}': {ti.item_name}")
    db.delete(ti)
    db.commit()


# ─── Bulk Issue ──────────────────────────────────────────────────────────────

@router.post("/{template_id}/bulk-issue", response_model=list[AssignmentOut], status_code=201)
def bulk_issue(template_id: str, body: BulkIssueBody, user: User = Depends(require("assignments:create")), db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    same_org(t.organization_id, user)
    if not t.items:
        raise HTTPException(400, "Template has no items")
    if not body.recipient_ids:
        raise HTTPException(400, "No recipients specified")

    recipients = db.query(Recipient).filter(Recipient.id.in_(body.recipient_ids)).all()
    if not recipients:
        raise HTTPException(404, "No matching recipients found")

    # Determine mode from org config
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    org_config = org.config or {} if org else {}
    mode = org_config.get("assignmentMode", "distribution")
    is_distribution = mode == "distribution"

    created: list[Assignment] = []
    ts = int(time.time() * 1000)

    for r in recipients:
        same_org(r.organization_id, user)
        for idx, titem in enumerate(t.items):
            a = Assignment(
                id=f"asgn_{ts}_{r.id[-6:]}_{idx}",
                organization_id=user.organization_id,
                recipient_id=r.id,
                recipient_name=r.name,
                recipient_identifier=r.identifier,
                recipient_group=r.group,
                item_id=titem.item_id,
                item_name=titem.item_name,
                quantity=titem.quantity,
                condition_issued=titem.condition_issued,
                issue_date=body.issue_date,
                expected_return=body.expected_return if not is_distribution else None,
                issued_by=body.issued_by,
                notes=body.notes,
                mode=mode,
                status="distributed" if is_distribution else "issued",
                template_id=t.id,
                template_name=t.name,
            )
            db.add(a)
            created.append(a)

            # Stock transaction for audit trail
            db.add(StockTransaction(
                id=f"tx_{ts}_{r.id[-6:]}_{idx}",
                organization_id=user.organization_id,
                date=body.issue_date,
                item_id=titem.item_id,
                item_name=titem.item_name,
                type="issued",
                quantity=-titem.quantity,
                user=body.issued_by or user.name,
                reference=f"BULK-{t.name[:12]}",
                recipient=r.name,
                recipient_class=r.group,
            ))

            if titem.item_id:
                inv_item = db.query(Item).filter(Item.id == titem.item_id).first()
                if inv_item:
                    if is_distribution:
                        inv_item.available = max(0, inv_item.available - titem.quantity)
                    else:
                        inv_item.reserved = (inv_item.reserved or 0) + titem.quantity
                        inv_item.available = max(0, inv_item.quantity - inv_item.reserved)
                    inv_item.status = compute_item_status(inv_item.available, inv_item.min_quantity or 10)
                    inv_item.last_updated = date.today().isoformat()

        ts += 1

    db.commit()
    for a in created:
        db.refresh(a)
    return created
