import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import CustomField, User
from ..schemas import CustomFieldOut, CustomFieldCreate, CustomFieldUpdate
from ..dependencies import require, same_org

router = APIRouter(prefix="/custom-fields", tags=["custom-fields"])


@router.get("", response_model=list[CustomFieldOut])
def list_custom_fields(user: User = Depends(require("settings:read")), db: Session = Depends(get_db)):
    return (
        db.query(CustomField)
        .filter(CustomField.organization_id == user.organization_id)
        .order_by(CustomField.sort_order, CustomField.id)
        .all()
    )


@router.post("", response_model=CustomFieldOut, status_code=201)
def create_custom_field(body: CustomFieldCreate, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    field = CustomField(
        id=f"cf_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        name=body.name,
        type=body.type,
        entity=body.entity,
        options=body.options,
        required=body.required,
        sort_order=body.sort_order,
        placeholder=body.placeholder,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.put("/{field_id}", response_model=CustomFieldOut)
def update_custom_field(field_id: str, body: CustomFieldUpdate, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(404, "Custom field not found")
    same_org(field.organization_id, user)
    for key, value in body.model_dump(by_alias=False, exclude_none=True).items():
        setattr(field, key, value)
    db.commit()
    db.refresh(field)
    return field


@router.delete("/{field_id}", status_code=204)
def delete_custom_field(field_id: str, user: User = Depends(require("settings:update")), db: Session = Depends(get_db)):
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(404, "Custom field not found")
    same_org(field.organization_id, user)
    db.delete(field)
    db.commit()
