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
    ClassEnrollmentHistory, compute_item_status,
)
from ..schemas import (
    OrgClassOut, OrgClassDetail, OrgClassCreate, OrgClassUpdate,
    OrgClassItemOut, OrgClassItemCreate, OrgClassItemUpdate,
    ClassStudentRow, ImportClassTemplateBody,
    AssignClassFeesBody, EnrolStudentBody,
    ClassEnrollmentHistoryOut, PromoteClassBody,
)
from ..dependencies import require, same_org
from ..audit import log_action

router = APIRouter(prefix="/classes", tags=["classes"])



def _fee_per_student(cls: OrgClass) -> int:
    return sum((i.unit_price or 0) * (i.quantity or 1) for i in cls.items)


def _recalculate_fees(cls: OrgClass, db: Session):
    """Update fee amounts for unpaid/partial/waived students when class items change."""
    total = _fee_per_student(cls)
    stale = db.query(FeeRecord).filter(
        FeeRecord.class_id == cls.id,
        FeeRecord.status.in_(["unpaid", "partial", "waived"]),
    ).all()
    for fee in stale:
        fee.total_amount = total
        if fee.paid_amount >= total and total > 0:
            fee.status = "paid"
        elif fee.paid_amount > 0:
            fee.status = "partial"
        else:
            fee.status = "unpaid"


def _auto_assign_fees(cls: OrgClass, db: Session, org_id: str, recipient_ids: list[str] | None = None) -> int:
    """Create FeeRecords for enrolled students who don't have one yet.
    If recipient_ids is given, only create for those students."""
    if not cls.items:
        return 0
    total = _fee_per_student(cls)
    students = db.query(Recipient).filter(Recipient.class_id == cls.id).all()
    if recipient_ids is not None:
        students = [s for s in students if s.id in set(recipient_ids)]
    if not students:
        return 0
    existing = {
        f.recipient_id
        for f in db.query(FeeRecord).filter(
            FeeRecord.class_id == cls.id,
            FeeRecord.organization_id == org_id,
        ).all()
    }
    ts = int(time.time() * 1000)
    created = 0
    for r in students:
        if r.id in existing:
            continue
        db.add(FeeRecord(
            id=f"fee_{ts}_{r.id[-6:]}",
            organization_id=org_id,
            recipient_id=r.id,
            recipient_name=r.name,
            class_id=cls.id,
            class_name=cls.name,
            template_name=cls.name,
            total_amount=total,
            paid_amount=0,
            status="unpaid",
            created_at=date.today().isoformat(),
        ))
        ts += 1
        created += 1
    return created


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
    existing = db.query(OrgClass).filter(
        OrgClass.organization_id == user.organization_id,
        OrgClass.name == body.name,
        OrgClass.academic_year == body.academic_year,
    ).first()
    if existing:
        year_str = f" ({body.academic_year})" if body.academic_year else ""
        raise HTTPException(409, f"A class named '{body.name}'{year_str} already exists")
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
    log_action(db, user, "create", "class", cls.id,
               f"Created class: {body.name} ({body.academic_year or 'no year'})")
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
    db.flush()
    db.refresh(cls)
    _recalculate_fees(cls, db)
    _auto_assign_fees(cls, db, user.organization_id)
    log_action(db, user, "add_item", "class", cid,
               f"Added item to {cls.name}: {body.item_name} ×{body.quantity} @ ₹{body.unit_price}")
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
    changes = body.model_dump(exclude_none=True)
    before = {k: getattr(item, k) for k in changes}
    for field, value in changes.items():
        setattr(item, field, value)
    db.flush()
    db.refresh(cls)
    _recalculate_fees(cls, db)
    log_action(db, user, "update_item", "class", cid,
               f"Updated item in {cls.name}: {item.item_name}",
               before=before, after=changes)
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
    item_name = item.item_name
    db.delete(item)
    db.flush()
    db.refresh(cls)
    _recalculate_fees(cls, db)
    log_action(db, user, "remove_item", "class", cid,
               f"Removed item from {cls.name}: {item_name}")
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
    db.flush()  # ensure items are visible to fee helpers
    db.refresh(cls)
    _recalculate_fees(cls, db)
    _auto_assign_fees(cls, db, user.organization_id)
    log_action(db, user, "import_template", "class", cid,
               f"Imported template '{tpl.name}' into {cls.name} ({len(tpl.items)} items)")
    db.commit()
    db.refresh(cls)
    return _build_detail(cls, db)


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

    db.flush()
    # Close any open enrollment history for this recipient (shouldn't happen, but safety)
    open_history = db.query(ClassEnrollmentHistory).filter(
        ClassEnrollmentHistory.recipient_id == r.id,
        ClassEnrollmentHistory.left_at.is_(None),
    ).all()
    for h in open_history:
        h.left_at = date.today().isoformat()

    # Log new enrollment
    db.add(ClassEnrollmentHistory(
        id=f"ceh_{int(time.time() * 1000)}_{r.id[-6:]}",
        organization_id=user.organization_id,
        recipient_id=r.id,
        class_id=cid,
        class_name=cls.name,
        academic_year=cls.academic_year,
        joined_at=date.today().isoformat(),
    ))

    # Auto-assign fee for the newly enrolled student (if class has items)
    _auto_assign_fees(cls, db, user.organization_id, recipient_ids=[r.id])
    log_action(db, user, "enrol", "class", cid,
               f"Enrolled {r.name} [{r.identifier or '—'}] in {cls.name} ({cls.academic_year or '—'})")
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
    # Close enrollment history entry
    open_h = db.query(ClassEnrollmentHistory).filter(
        ClassEnrollmentHistory.recipient_id == rid,
        ClassEnrollmentHistory.class_id == cid,
        ClassEnrollmentHistory.left_at.is_(None),
    ).first()
    if open_h:
        open_h.left_at = date.today().isoformat()
    log_action(db, user, "unenrol", "class", cid,
               f"Removed {r.name} [{r.identifier or '—'}] from {cls.name}")
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
        raise HTTPException(400, "Class has no items — add items or import a template first")

    students = db.query(Recipient).filter(Recipient.class_id == cid).all()
    if not students:
        raise HTTPException(400, "No students enrolled in this class")

    rids = [body.recipient_id] if body.recipient_id else None
    created = _auto_assign_fees(cls, db, user.organization_id, recipient_ids=rids)
    db.commit()
    total = len(students) if not rids else len(rids)
    return {"created": created, "skipped": total - created}


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
                        inv_item.available = max(0, inv_item.available - ci.quantity)
                    else:
                        inv_item.reserved = (inv_item.reserved or 0) + ci.quantity
                        inv_item.available = max(0, inv_item.quantity - inv_item.reserved)
                    inv_item.status = compute_item_status(
                        inv_item.available, inv_item.min_quantity or 10
                    )
                    inv_item.last_updated = today

        fee.status = "distributed"
        fee.distributed_date = today
        distributed += 1
        ts += 1

    log_action(db, user, "distribute_all", "class", cid,
               f"Bulk distributed to {distributed} student(s) in {cls.name}")
    db.commit()
    return {"distributed": distributed}


# ── Promote class (move all students to a new class) ─────────────────────────

@router.post("/{cid}/promote")
def promote_class(
    cid: str,
    body: PromoteClassBody,
    user: User = Depends(require("inventory:update")),
    db: Session = Depends(get_db),
):
    """
    Move all currently enrolled students from source class to target class.
    Closes their history entry in source, opens a new one in target.
    """
    src = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not src:
        raise HTTPException(404, "Source class not found")
    same_org(src.organization_id, user)

    tgt = db.query(OrgClass).filter(OrgClass.id == body.target_class_id).first()
    if not tgt:
        raise HTTPException(404, "Target class not found")
    same_org(tgt.organization_id, user)

    if cid == body.target_class_id:
        raise HTTPException(400, "Source and target class must be different")

    students = db.query(Recipient).filter(Recipient.class_id == cid).all()
    if not students:
        raise HTTPException(400, "No students enrolled in this class")

    today = date.today().isoformat()
    ts = int(time.time() * 1000)

    for r in students:
        # Close old history entry
        open_h = db.query(ClassEnrollmentHistory).filter(
            ClassEnrollmentHistory.recipient_id == r.id,
            ClassEnrollmentHistory.class_id == cid,
            ClassEnrollmentHistory.left_at.is_(None),
        ).first()
        if open_h:
            open_h.left_at = today

        # Move to target class
        r.class_id = tgt.id
        r.group = tgt.name

        # Open new history entry
        db.add(ClassEnrollmentHistory(
            id=f"ceh_{ts}_{r.id[-6:]}",
            organization_id=user.organization_id,
            recipient_id=r.id,
            class_id=tgt.id,
            class_name=tgt.name,
            academic_year=tgt.academic_year,
            joined_at=today,
        ))
        ts += 1

    log_action(db, user, "promote", "class", cid,
               f"Promoted {len(students)} student(s) from {src.name} → {tgt.name} ({tgt.academic_year or '—'})")
    db.commit()
    return {"promoted": len(students), "targetClass": tgt.name}


# ── Enrollment history for a single recipient ─────────────────────────────────

@router.get("/enrollment-history/{recipient_id}", response_model=list[ClassEnrollmentHistoryOut])
def get_enrollment_history(
    recipient_id: str,
    user: User = Depends(require("inventory:read")),
    db: Session = Depends(get_db),
):
    return (
        db.query(ClassEnrollmentHistory)
        .filter(
            ClassEnrollmentHistory.recipient_id == recipient_id,
            ClassEnrollmentHistory.organization_id == user.organization_id,
        )
        .order_by(ClassEnrollmentHistory.joined_at.desc())
        .all()
    )
