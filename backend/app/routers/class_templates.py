"""
Class Material Templates — CRUD + bulk-issue endpoint.
Supports schools and any org that needs to issue a standard set of items
to a whole class/group in one shot.
"""
import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ClassTemplate, ClassTemplateItem, Recipient, Assignment, Item
from ..schemas import (
    ClassTemplateOut, ClassTemplateCreate, ClassTemplateUpdate,
    ClassTemplateItemOut, ClassTemplateItemCreate,
    BulkIssueBody, AssignmentOut,
)

router = APIRouter(prefix="/class-templates", tags=["class_templates"])


# ─── Template CRUD ──────────────────────────────────────────────────────────

@router.get("", response_model=list[ClassTemplateOut])
def list_templates(org_id: str = Query(...), db: Session = Depends(get_db)):
    return (
        db.query(ClassTemplate)
        .filter(ClassTemplate.organization_id == org_id)
        .order_by(ClassTemplate.name)
        .all()
    )


@router.post("", response_model=ClassTemplateOut, status_code=201)
def create_template(body: ClassTemplateCreate, db: Session = Depends(get_db)):
    tid = f"ct_{int(time.time() * 1000)}"
    t = ClassTemplate(
        id=tid,
        organization_id=body.organization_id,
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
    db.commit()
    db.refresh(t)
    return t


@router.get("/{template_id}", response_model=ClassTemplateOut)
def get_template(template_id: str, db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    return t


@router.put("/{template_id}", response_model=ClassTemplateOut)
def update_template(template_id: str, body: ClassTemplateUpdate, db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, db: Session = Depends(get_db)):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    db.delete(t)
    db.commit()


# ─── Template Items ──────────────────────────────────────────────────────────

@router.post("/{template_id}/items", response_model=ClassTemplateItemOut, status_code=201)
def add_template_item(
    template_id: str,
    body: ClassTemplateItemCreate,
    db: Session = Depends(get_db),
):
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    item = ClassTemplateItem(
        id=f"cti_{int(time.time() * 1000)}",
        template_id=template_id,
        item_id=body.item_id,
        item_name=body.item_name,
        quantity=body.quantity,
        condition_issued=body.condition_issued,
        notes=body.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{template_id}/items/{item_id}", response_model=ClassTemplateItemOut)
def update_template_item(
    template_id: str,
    item_id: str,
    body: ClassTemplateItemCreate,
    db: Session = Depends(get_db),
):
    ti = (
        db.query(ClassTemplateItem)
        .filter(ClassTemplateItem.id == item_id, ClassTemplateItem.template_id == template_id)
        .first()
    )
    if not ti:
        raise HTTPException(404, "Item not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(ti, field, value)
    db.commit()
    db.refresh(ti)
    return ti


@router.delete("/{template_id}/items/{item_id}", status_code=204)
def delete_template_item(
    template_id: str,
    item_id: str,
    db: Session = Depends(get_db),
):
    ti = (
        db.query(ClassTemplateItem)
        .filter(ClassTemplateItem.id == item_id, ClassTemplateItem.template_id == template_id)
        .first()
    )
    if not ti:
        raise HTTPException(404, "Item not found")
    db.delete(ti)
    db.commit()


# ─── Bulk Issue ──────────────────────────────────────────────────────────────

@router.post("/{template_id}/bulk-issue", response_model=list[AssignmentOut], status_code=201)
def bulk_issue(
    template_id: str,
    body: BulkIssueBody,
    db: Session = Depends(get_db),
):
    """
    Issue every item in the template to every recipient in recipient_ids.
    Creates N × M assignments atomically (N recipients, M template items).
    Updates item.reserved / item.available for each inventory item.
    """
    t = db.query(ClassTemplate).filter(ClassTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    if not t.items:
        raise HTTPException(400, "Template has no items")
    if not body.recipient_ids:
        raise HTTPException(400, "No recipients specified")

    # Fetch recipients
    recipients = (
        db.query(Recipient)
        .filter(Recipient.id.in_(body.recipient_ids))
        .all()
    )
    if not recipients:
        raise HTTPException(404, "No matching recipients found")

    from ..routers.inventory import _compute_status

    created: list[Assignment] = []
    ts = int(time.time() * 1000)

    for r in recipients:
        for idx, titem in enumerate(t.items):
            a = Assignment(
                id=f"asgn_{ts}_{r.id[-6:]}_{idx}",
                organization_id=t.organization_id,
                recipient_id=r.id,
                recipient_name=r.name,
                recipient_identifier=r.identifier,
                recipient_group=r.group,
                item_id=titem.item_id,
                item_name=titem.item_name,
                quantity=titem.quantity,
                condition_issued=titem.condition_issued,
                issue_date=body.issue_date,
                expected_return=body.expected_return,
                issued_by=body.issued_by,
                notes=body.notes,
                status="issued",
            )
            db.add(a)
            created.append(a)

            # Update inventory reservation
            if titem.item_id:
                inv_item = db.query(Item).filter(Item.id == titem.item_id).first()
                if inv_item:
                    inv_item.reserved = (inv_item.reserved or 0) + titem.quantity
                    inv_item.available = max(0, inv_item.quantity - inv_item.reserved)
                    inv_item.status = _compute_status(inv_item.available, inv_item.min_quantity or 10)
                    inv_item.last_updated = date.today().isoformat()

        ts += 1  # ensure unique IDs even if recipients processed in the same millisecond

    db.commit()
    for a in created:
        db.refresh(a)
    return created
