"""
Class-based fee flow router.

Endpoints
─────────
GET    /classes                            list all classes (with counts)
POST   /classes                            create class
GET    /classes/{cid}                      class detail: items + students + fee stats
PUT    /classes/{cid}                      update class
DELETE /classes/{cid}                      delete class

POST   /classes/{cid}/items               add item to class
PUT    /classes/{cid}/items/{iid}         update class item
DELETE /classes/{cid}/items/{iid}         remove class item
POST   /classes/{cid}/import-template     copy items from a ClassTemplate

POST   /classes/{cid}/students            enrol student (existing or new)
DELETE /classes/{cid}/students/{rid}      remove student from class

POST   /classes/{cid}/assign-fees         create FeeRecords for all enrolled students
POST   /classes/{cid}/distribute-paid     distribute items to every paid/waived student
"""
import time
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    OrgClass, OrgClassItem, Recipient, FeeRecord,
    Assignment, Item, ClassTemplate, Organization, StockTransaction, User,
)
from ..schemas import (
    OrgClassOut, OrgClassDetail, OrgClassCreate, OrgClassUpdate,
    OrgClassItemOut, OrgClassItemCreate, OrgClassItemUpdate,
    ClassStudentRow, ImportClassTemplateBody,
    AssignClassFeesBody, EnrolStudentBody,
)
from ..dependencies import require, same_org

router = APIRouter(prefix="/classes", tags=["classes"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _compute_status(qty: int, min_qty: int = 10) -> str:
    if qty == 0:
        return "out_of_stock"
    if qty <= min_qty:
        return "low_stock"
    return "in_stock"


def _fee_per_student(cls: OrgClass) -> int:
    return sum((i.unit_price or 0) * (i.quantity or 1) for i in cls.items)


def _build_detail(cls: OrgClass, db: Session) -> dict:
    """Build full class detail dict including students list."""
    base = _build_out(cls, db)
    students_raw = (
        db.query(Recipient)
        .filter(Recipient.class_id == cls.id)
        .order_by(Recipient.identifier, Recipient.name)
        .all()
    )
    fees = db.query(FeeRecord).filter(
        FeeRecord.class_id == cls.id,
        FeeRecord.organization_id == cls.organization_id,
    ).all()
    fee_map = {f.recipient_id: f for f in fees}
    students = []
    for r in students_raw:
        fr = fee_map.get(r.id)
        students.append({
            "recipientId": r.id,
            "name": r.name,
            "identifier": r.identifier,
            "contact": r.contact,
            "feeRecordId": fr.id if fr else None,
            "feeStatus": fr.status if fr else "no_fee",
            "paidAmount": fr.paid_amount if fr else 0,
            "totalAmount": fr.total_amount if fr else 0,
            "paymentDate": fr.payment_date if fr else None,
            "distributedDate": fr.distributed_date if fr else None,
        })
    base["students"] = students
    return base


def _build_out(cls: OrgClass, db: Session) -> dict:
    """Build OrgClassOut dict with computed counts."""
    fee_per_student = _fee_per_student(cls)
    student_count = db.query(Recipient).filter(
        Recipient.class_id == cls.id
    ).count()
    fees = db.query(FeeRecord).filter(
        FeeRecord.class_id == cls.id,
        FeeRecord.organization_id == cls.organization_id,
    ).all()
    paid = sum(1 for f in fees if f.status in ("paid", "waived"))
    dist = sum(1 for f in fees if f.status == "distributed")
    unpaid = sum(1 for f in fees if f.status in ("unpaid", "partial"))
    return {
        "id": cls.id,
        "organizationId": cls.organization_id,
        "name": cls.name,
        "academicYear": cls.academic_year,
        "notes": cls.notes,
        "status": cls.status,
        "createdAt": cls.created_at,
        "items": [_item_dict(i) for i in cls.items],
        "totalFeePerStudent": fee_per_student,
        "studentCount": student_count,
        "paidCount": paid,
        "distributedCount": dist,
        "unpaidCount": unpaid,
    }


def _item_dict(i: OrgClassItem) -> dict:
    return {
        "id": i.id,
        "classId": i.class_id,
        "itemId": i.item_id,
        "itemName": i.item_name,
        "quantity": i.quantity,
        "unitPrice": i.unit_price,
        "conditionIssued": i.condition_issued,
        "notes": i.notes,
    }


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[OrgClassOut])
def list_classes(
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db),
):
    classes = (
        db.query(OrgClass)
        .filter(OrgClass.organization_id == user.organization_id)
        .order_by(OrgClass.name)
        .all()
    )
    return [_build_out(c, db) for c in classes]


@router.post("", status_code=201)
def create_class(
    body: OrgClassCreate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db),
):
    cls = OrgClass(
        id=f"cls_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        name=body.name,
        academic_year=body.academic_year,
        notes=body.notes,
        status="active",
        created_at=date.today().isoformat(),
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return _build_out(cls, db)


@router.get("/{cid}")
def get_class(
    cid: str,
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db),
):
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    return _build_detail(cls, db)


@router.put("/{cid}")
def update_class(
    cid: str,
    body: OrgClassUpdate,
    user: User = Depends(require("inventory:update")),
    db: Session = Depends(get_db),
):
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(cls, field, value)
    db.commit()
    db.refresh(cls)
    return _build_out(cls, db)


@router.delete("/{cid}", status_code=204)
def delete_class(
    cid: str,
    user: User = Depends(require("inventory:delete")),
    db: Session = Depends(get_db),
):
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    db.delete(cls)
    db.commit()


# ── Class Items ───────────────────────────────────────────────────────────────

@router.post("/{cid}/items", status_code=201)
def add_class_item(
    cid: str,
    body: OrgClassItemCreate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db),
):
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    item = OrgClassItem(
        id=f"oci_{int(time.time() * 1000)}",
        class_id=cid,
        item_id=body.item_id,
        item_name=body.item_name,
        quantity=body.quantity,
        unit_price=body.unit_price,
        condition_issued=body.condition_issued,
        notes=body.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(cls)
    return _build_out(cls, db)


@router.put("/{cid}/items/{iid}")
def update_class_item(
    cid: str,
    iid: str,
    body: OrgClassItemUpdate,
    user: User = Depends(require("inventory:update")),
    db: Session = Depends(get_db),
):
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    item = db.query(OrgClassItem).filter(
        OrgClassItem.id == iid, OrgClassItem.class_id == cid
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(cls)
    return _build_out(cls, db)


@router.delete("/{cid}/items/{iid}")
def remove_class_item(
    cid: str,
    iid: str,
    user: User = Depends(require("inventory:delete")),
    db: Session = Depends(get_db),
):
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    item = db.query(OrgClassItem).filter(
        OrgClassItem.id == iid, OrgClassItem.class_id == cid
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()
    db.refresh(cls)
    return _build_out(cls, db)


@router.post("/{cid}/import-template")
def import_template(
    cid: str,
    body: ImportClassTemplateBody,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db),
):
    """Copy all items from a ClassTemplate into this class."""
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    tpl = db.query(ClassTemplate).filter(ClassTemplate.id == body.template_id).first()
    if not tpl:
        raise HTTPException(404, "Template not found")
    same_org(tpl.organization_id, user)
    ts = int(time.time() * 1000)
    for idx, ti in enumerate(tpl.items):
        db.add(OrgClassItem(
            id=f"oci_{ts}_{idx}",
            class_id=cid,
            item_id=ti.item_id,
            item_name=ti.item_name,
            quantity=ti.quantity,
            unit_price=ti.unit_price or 0,
            condition_issued=ti.condition_issued or "New",
            notes=ti.notes,
        ))
    db.commit()
    db.refresh(cls)
    return _build_out(cls, db)


# ── Students ──────────────────────────────────────────────────────────────────

@router.post("/{cid}/students", status_code=201)
def enrol_student(
    cid: str,
    body: EnrolStudentBody,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db),
):
    """
    Enrol a student in this class.
    Pass recipient_id to link an existing recipient, or pass name/identifier
    to create a new one on the spot.
    """
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)

    if body.recipient_id:
        r = db.query(Recipient).filter(Recipient.id == body.recipient_id).first()
        if not r:
            raise HTTPException(404, "Recipient not found")
        same_org(r.organization_id, user)
        r.class_id = cid
        r.group = cls.name  # keep group in sync for backward-compat
    else:
        if not body.name:
            raise HTTPException(400, "Provide recipient_id or name")
        r = Recipient(
            id=f"rec_{int(time.time() * 1000)}",
            organization_id=user.organization_id,
            name=body.name,
            identifier=body.identifier,
            group=cls.name,
            contact=body.contact,
            extra_data=body.extra_data,
            class_id=cid,
        )
        db.add(r)

    db.commit()
    db.refresh(cls)
    return _build_detail(cls, db)


@router.delete("/{cid}/students/{rid}")
def remove_student(
    cid: str,
    rid: str,
    user: User = Depends(require("inventory:update")),
    db: Session = Depends(get_db),
):
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    r = db.query(Recipient).filter(
        Recipient.id == rid, Recipient.class_id == cid
    ).first()
    if not r:
        raise HTTPException(404, "Student not enrolled in this class")
    r.class_id = None  # unenrol — do not delete the recipient
    db.commit()
    db.refresh(cls)
    return _build_detail(cls, db)


# ── Fee Assignment ────────────────────────────────────────────────────────────

@router.post("/{cid}/assign-fees")
def assign_fees(
    cid: str,
    body: AssignClassFeesBody,
    user: User = Depends(require("assignments:create")),
    db: Session = Depends(get_db),
):
    """
    Create FeeRecords for every enrolled student who doesn't have one yet.
    Total amount = sum(item.unit_price * item.quantity) for the class.
    """
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    if not cls.items:
        raise HTTPException(400, "Class has no items — add items before assigning fees")

    total = _fee_per_student(cls)
    students = db.query(Recipient).filter(Recipient.class_id == cid).all()
    if not students:
        raise HTTPException(400, "No students enrolled in this class")

    # Filter to a single student if requested
    if body.recipient_id:
        students = [s for s in students if s.id == body.recipient_id]
        if not students:
            raise HTTPException(404, "Recipient not enrolled in this class")

    # Find which students already have a fee record for this class
    existing_rids = {
        f.recipient_id
        for f in db.query(FeeRecord).filter(
            FeeRecord.class_id == cid,
            FeeRecord.organization_id == user.organization_id,
        ).all()
    }

    ts = int(time.time() * 1000)
    created = 0
    for r in students:
        if r.id in existing_rids:
            continue
        db.add(FeeRecord(
            id=f"fee_{ts}_{r.id[-6:]}",
            organization_id=user.organization_id,
            recipient_id=r.id,
            recipient_name=r.name,
            class_id=cid,
            class_name=cls.name,
            total_amount=total,
            paid_amount=0,
            status="unpaid" if total > 0 else "waived",
            notes=body.notes,
            created_at=date.today().isoformat(),
        ))
        ts += 1
        created += 1

    db.commit()
    return {"created": created, "skipped": len(students) - created}


# ── Distribute Paid ───────────────────────────────────────────────────────────

@router.post("/{cid}/distribute-paid")
def distribute_paid(
    cid: str,
    user: User = Depends(require("assignments:create")),
    db: Session = Depends(get_db),
):
    """
    Distribute items to every student whose fee is paid or waived.
    For each: creates Assignment records, StockTransactions, updates inventory.
    """
    cls = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    same_org(cls.organization_id, user)
    if not cls.items:
        raise HTTPException(400, "Class has no items")

    org = db.query(Organization).filter(
        Organization.id == user.organization_id
    ).first()
    org_config = org.config or {} if org else {}
    mode = org_config.get("assignmentMode", "distribution")
    is_distribution = mode == "distribution"

    ready_fees = db.query(FeeRecord).filter(
        FeeRecord.class_id == cid,
        FeeRecord.organization_id == user.organization_id,
        FeeRecord.status.in_(["paid", "waived"]),
    ).all()

    if not ready_fees:
        raise HTTPException(400, "No paid/waived fees to distribute")

    today = date.today().isoformat()
    ts = int(time.time() * 1000)
    distributed = 0

    for fee in ready_fees:
        recipient = db.query(Recipient).filter(
            Recipient.id == fee.recipient_id
        ).first()
        if not recipient:
            continue

        for idx, ci in enumerate(cls.items):
            asgn = Assignment(
                id=f"asgn_{ts}_{recipient.id[-6:]}_{idx}",
                organization_id=user.organization_id,
                recipient_id=recipient.id,
                recipient_name=recipient.name,
                recipient_identifier=recipient.identifier,
                recipient_group=recipient.group,
                item_id=ci.item_id,
                item_name=ci.item_name,
                quantity=ci.quantity,
                condition_issued=ci.condition_issued or "New",
                issue_date=today,
                issued_by=user.name,
                mode=mode,
                status="distributed" if is_distribution else "issued",
                unit_price=ci.unit_price or 0,
                fee_amount=(ci.unit_price or 0) * (ci.quantity or 1),
                fee_status="paid",
                template_id=None,
                template_name=cls.name,
            )
            db.add(asgn)

            # Always create stock transaction
            db.add(StockTransaction(
                id=f"tx_{ts}_{recipient.id[-6:]}_{idx}",
                organization_id=user.organization_id,
                date=today,
                item_id=ci.item_id,
                item_name=ci.item_name,
                type="issued",
                quantity=-ci.quantity,
                user=user.name,
                reference=f"FEE-{fee.id[-8:]}",
                recipient=recipient.name,
                recipient_class=cls.name,
                notes=f"Distributed from class: {cls.name}",
            ))

            # Reduce inventory
            if ci.item_id:
                inv_item = db.query(Item).filter(Item.id == ci.item_id).first()
                if inv_item:
                    if is_distribution:
                        inv_item.quantity = max(0, inv_item.quantity - ci.quantity)
                        inv_item.available = max(
                            0, inv_item.quantity - (inv_item.reserved or 0)
                        )
                    else:
                        inv_item.reserved = (inv_item.reserved or 0) + ci.quantity
                        inv_item.available = max(
                            0, inv_item.quantity - inv_item.reserved
                        )
                    inv_item.status = _compute_status(
                        inv_item.available, inv_item.min_quantity or 10
                    )
                    inv_item.last_updated = today

        fee.status = "distributed"
        fee.distributed_date = today
        distributed += 1
        ts += 1

    db.commit()
    return {"distributed": distributed}
