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
    BatchClassCreate, CloneYearClassesBody, TransferStudentBody, StudentPromotionItem,
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


@router.post("/batch", status_code=201)
def create_batch_classes(
    body: BatchClassCreate,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db),
):
    """
    Generate multiple classes in bulk from Grade levels + Sections.
    e.g. Grades: ['Grade 1', 'Grade 2'], Sections: ['A', 'B']
    -> 'Grade 1A', 'Grade 1B', 'Grade 2A', 'Grade 2B'
    Skips duplicates automatically and returns created and skipped counts.
    """
    if not body.grades or not body.sections:
        raise HTTPException(400, "Provide at least one grade and one section")

    existing_classes = db.query(OrgClass).filter(
        OrgClass.organization_id == user.organization_id,
        OrgClass.academic_year == body.academic_year,
    ).all()
    existing_names = {c.name.strip().lower() for c in existing_classes}

    created_classes = []
    skipped_count = 0
    today = date.today().isoformat()
    ts = int(time.time() * 1000)

    for g in body.grades:
        g_clean = g.strip()
        if not g_clean:
            continue
        for s in body.sections:
            s_clean = s.strip()
            if not s_clean:
                continue

            # Format name: Grade 5 + A -> Grade 5A; Grade 5 + Section A -> Grade 5 Section A
            if s_clean.lower().startswith("section") or s_clean.startswith("-"):
                name = f"{g_clean} {s_clean}".strip()
            elif g_clean and g_clean[-1].isdigit() and (s_clean.isalpha() and len(s_clean) == 1):
                name = f"{g_clean}{s_clean}"
            elif g_clean.endswith(" "):
                name = f"{g_clean}{s_clean}"
            else:
                name = f"{g_clean} {s_clean}"

            if name.lower() in existing_names:
                skipped_count += 1
                continue

            cls = OrgClass(
                id=f"cls_{ts}_{len(created_classes)}",
                organization_id=user.organization_id,
                name=name,
                academic_year=body.academic_year,
                notes=body.notes,
                status="active",
                created_at=today,
            )
            db.add(cls)
            existing_names.add(name.lower())
            created_classes.append(cls)

    if created_classes:
        log_action(db, user, "batch_create", "class", "bulk",
                   f"Batch created {len(created_classes)} classes for year {body.academic_year or 'none'}")
        db.commit()
        for c in created_classes:
            db.refresh(c)

    return {
        "createdCount": len(created_classes),
        "skippedCount": skipped_count,
        "classes": [_build_out(c, db) for c in created_classes],
    }


@router.post("/clone-year", status_code=201)
def clone_year_classes(
    body: CloneYearClassesBody,
    user: User = Depends(require("inventory:create")),
    db: Session = Depends(get_db),
):
    """
    Clone class structure from source_academic_year to target_academic_year.
    Optionally copies items/templates as well with clean student rosters.
    """
    if body.source_academic_year == body.target_academic_year:
        raise HTTPException(400, "Source and target academic year must be different")

    source_classes = db.query(OrgClass).filter(
        OrgClass.organization_id == user.organization_id,
        OrgClass.academic_year == body.source_academic_year,
    ).all()

    if not source_classes:
        raise HTTPException(404, f"No classes found for academic year '{body.source_academic_year}'")

    existing_target = db.query(OrgClass).filter(
        OrgClass.organization_id == user.organization_id,
        OrgClass.academic_year == body.target_academic_year,
    ).all()
    existing_names = {c.name.strip().lower() for c in existing_target}

    created_classes = []
    skipped_count = 0
    today = date.today().isoformat()
    ts = int(time.time() * 1000)

    for src in source_classes:
        if src.name.strip().lower() in existing_names:
            skipped_count += 1
            continue

        new_cls = OrgClass(
            id=f"cls_{ts}_{len(created_classes)}",
            organization_id=user.organization_id,
            name=src.name,
            academic_year=body.target_academic_year,
            notes=src.notes,
            status="active",
            created_at=today,
        )
        db.add(new_cls)

        if body.copy_template_items and src.items:
            for idx, item in enumerate(src.items):
                db.add(OrgClassItem(
                    id=f"oci_{ts}_{len(created_classes)}_{idx}",
                    class_id=new_cls.id,
                    item_id=item.item_id,
                    item_name=item.item_name,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    condition_issued=item.condition_issued,
                    notes=item.notes,
                ))

        created_classes.append(new_cls)
        existing_names.add(src.name.strip().lower())

    if created_classes:
        log_action(db, user, "clone_year", "class", "bulk",
                   f"Cloned {len(created_classes)} classes from {body.source_academic_year} → {body.target_academic_year}")
        db.commit()
        for c in created_classes:
            db.refresh(c)

    return {
        "createdCount": len(created_classes),
        "skippedCount": skipped_count,
        "classes": [_build_out(c, db) for c in created_classes],
    }


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
        action_type="enrolled",
        performed_by=user.name,
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


@router.post("/{cid}/students/{rid}/transfer")
def transfer_student(
    cid: str,
    rid: str,
    body: TransferStudentBody,
    user: User = Depends(require("inventory:update")),
    db: Session = Depends(get_db),
):
    """
    Transfer a student from class cid to target_class_id (e.g. section change 5A -> 5B).
    Preserves audit history with transfer reason and staff actor.
    If keep_fees is True, transfers active fee records to the target class so
    student doesn't get double billed.
    """
    src = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not src:
        raise HTTPException(404, "Source class not found")
    same_org(src.organization_id, user)

    if cid == body.target_class_id:
        raise HTTPException(400, "Source and target class must be different")

    tgt = db.query(OrgClass).filter(OrgClass.id == body.target_class_id).first()
    if not tgt:
        raise HTTPException(404, "Target class not found")
    same_org(tgt.organization_id, user)

    r = db.query(Recipient).filter(Recipient.id == rid, Recipient.class_id == cid).first()
    if not r:
        raise HTTPException(404, "Student not enrolled in source class")

    today = date.today().isoformat()
    ts = int(time.time() * 1000)

    # Close current enrollment
    open_h = db.query(ClassEnrollmentHistory).filter(
        ClassEnrollmentHistory.recipient_id == rid,
        ClassEnrollmentHistory.class_id == cid,
        ClassEnrollmentHistory.left_at.is_(None),
    ).first()
    if open_h:
        open_h.left_at = today

    # Move to target
    r.class_id = tgt.id
    r.group = tgt.name

    # Create transfer history record
    db.add(ClassEnrollmentHistory(
        id=f"ceh_{ts}_{r.id[-6:]}",
        organization_id=user.organization_id,
        recipient_id=r.id,
        class_id=tgt.id,
        class_name=tgt.name,
        academic_year=tgt.academic_year,
        joined_at=today,
        action_type="section_transfer",
        from_class_id=src.id,
        from_class_name=src.name,
        reason=body.reason,
        performed_by=user.name,
    ))

    # Fee handling
    if body.keep_fees:
        fees = db.query(FeeRecord).filter(
            FeeRecord.recipient_id == rid,
            FeeRecord.class_id == src.id,
        ).all()
        for f in fees:
            f.class_id = tgt.id
            f.class_name = tgt.name
    else:
        # Auto-assign fee for new class if target class has items
        _auto_assign_fees(tgt, db, user.organization_id, recipient_ids=[r.id])

    log_action(db, user, "transfer_student", "class", cid,
               f"Transferred {r.name} from {src.name} → {tgt.name} (Reason: {body.reason or 'None'})")
    db.commit()
    db.refresh(src)
    return _build_detail(src, db)


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
    Promote class students with support for both granular per-student assignments
    (promote to specific section, retain, graduate) and bulk promotion.
    Preserves audit history with action_type, reason, and actor.
    """
    src = db.query(OrgClass).filter(OrgClass.id == cid).first()
    if not src:
        raise HTTPException(404, "Source class not found")
    same_org(src.organization_id, user)

    students = db.query(Recipient).filter(Recipient.class_id == cid).all()
    if not students:
        raise HTTPException(400, "No students enrolled in this class")

    student_map = {r.id: r for r in students}
    today = date.today().isoformat()
    ts = int(time.time() * 1000)

    # Cache for target classes to avoid repetitive DB queries
    target_cache: dict[str, OrgClass] = {}

    def get_target(t_id: str) -> OrgClass:
        if t_id not in target_cache:
            t = db.query(OrgClass).filter(OrgClass.id == t_id).first()
            if not t:
                raise HTTPException(404, f"Target class '{t_id}' not found")
            same_org(t.organization_id, user)
            target_cache[t_id] = t
        return target_cache[t_id]

    promoted_count = 0
    retained_count = 0
    graduated_count = 0
    withdrawn_count = 0

    if body.student_promotions:
        for p in body.student_promotions:
            r = student_map.get(p.recipient_id)
            if not r:
                continue

            # Close existing enrollment
            open_h = db.query(ClassEnrollmentHistory).filter(
                ClassEnrollmentHistory.recipient_id == r.id,
                ClassEnrollmentHistory.class_id == cid,
                ClassEnrollmentHistory.left_at.is_(None),
            ).first()
            if open_h:
                open_h.left_at = today

            action = p.action or "promote"
            target_id = p.target_class_id or body.target_class_id

            if action == "promote" and target_id:
                if target_id == cid:
                    raise HTTPException(400, "Cannot promote student into the same class")
                tgt = get_target(target_id)
                r.class_id = tgt.id
                r.group = tgt.name
                r.status = "active"
                db.add(ClassEnrollmentHistory(
                    id=f"ceh_{ts}_{r.id[-6:]}",
                    organization_id=user.organization_id,
                    recipient_id=r.id,
                    class_id=tgt.id,
                    class_name=tgt.name,
                    academic_year=tgt.academic_year,
                    joined_at=today,
                    action_type="promoted",
                    from_class_id=src.id,
                    from_class_name=src.name,
                    reason=p.reason,
                    performed_by=user.name,
                ))
                promoted_count += 1

            elif action == "retain":
                # Retained in same grade level (can move to new academic year repeat class or stay)
                if target_id and target_id != cid:
                    tgt = get_target(target_id)
                    r.class_id = tgt.id
                    r.group = tgt.name
                    class_id_val = tgt.id
                    class_name_val = tgt.name
                    acad_year_val = tgt.academic_year
                else:
                    class_id_val = src.id
                    class_name_val = src.name
                    acad_year_val = src.academic_year

                db.add(ClassEnrollmentHistory(
                    id=f"ceh_{ts}_{r.id[-6:]}",
                    organization_id=user.organization_id,
                    recipient_id=r.id,
                    class_id=class_id_val,
                    class_name=class_name_val,
                    academic_year=acad_year_val,
                    joined_at=today,
                    action_type="retained",
                    from_class_id=src.id,
                    from_class_name=src.name,
                    reason=p.reason or "Retained in grade",
                    performed_by=user.name,
                ))
                retained_count += 1

            elif action == "graduate":
                r.class_id = None
                r.status = "graduated"
                db.add(ClassEnrollmentHistory(
                    id=f"ceh_{ts}_{r.id[-6:]}",
                    organization_id=user.organization_id,
                    recipient_id=r.id,
                    class_id=None,
                    class_name="Graduated / Alumni",
                    academic_year=src.academic_year,
                    joined_at=today,
                    left_at=today,
                    action_type="graduated",
                    from_class_id=src.id,
                    from_class_name=src.name,
                    reason=p.reason or "Course completed",
                    performed_by=user.name,
                ))
                graduated_count += 1

            elif action == "withdraw":
                r.class_id = None
                r.status = "withdrawn"
                db.add(ClassEnrollmentHistory(
                    id=f"ceh_{ts}_{r.id[-6:]}",
                    organization_id=user.organization_id,
                    recipient_id=r.id,
                    class_id=None,
                    class_name=src.name,
                    academic_year=src.academic_year,
                    joined_at=today,
                    left_at=today,
                    action_type="withdrawn",
                    from_class_id=src.id,
                    from_class_name=src.name,
                    reason=p.reason or "Withdrawn from institution",
                    performed_by=user.name,
                ))
                withdrawn_count += 1
            ts += 1

    else:
        # Bulk promote all students to target_class_id
        if not body.target_class_id:
            raise HTTPException(400, "Provide target_class_id or student_promotions")
        if body.target_class_id == cid:
            raise HTTPException(400, "Source and target class must be different")

        tgt = get_target(body.target_class_id)
        for r in students:
            open_h = db.query(ClassEnrollmentHistory).filter(
                ClassEnrollmentHistory.recipient_id == r.id,
                ClassEnrollmentHistory.class_id == cid,
                ClassEnrollmentHistory.left_at.is_(None),
            ).first()
            if open_h:
                open_h.left_at = today

            r.class_id = tgt.id
            r.group = tgt.name
            db.add(ClassEnrollmentHistory(
                id=f"ceh_{ts}_{r.id[-6:]}",
                organization_id=user.organization_id,
                recipient_id=r.id,
                class_id=tgt.id,
                class_name=tgt.name,
                academic_year=tgt.academic_year,
                joined_at=today,
                action_type="promoted",
                from_class_id=src.id,
                from_class_name=src.name,
                performed_by=user.name,
            ))
            ts += 1
            promoted_count += 1

    log_action(db, user, "promote", "class", cid,
               f"Promoted {promoted_count}, Retained {retained_count}, Graduated {graduated_count} from {src.name}")
    db.commit()
    return {
        "promoted": promoted_count,
        "retained": retained_count,
        "graduated": graduated_count,
        "withdrawn": withdrawn_count,
        "targetClass": tgt.name if (not body.student_promotions and body.target_class_id and 'tgt' in locals()) else (src.name),
        "totalProcessed": promoted_count + retained_count + graduated_count + withdrawn_count,
    }


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
        .order_by(ClassEnrollmentHistory.joined_at.desc(), ClassEnrollmentHistory.id.desc())
        .all()
    )
