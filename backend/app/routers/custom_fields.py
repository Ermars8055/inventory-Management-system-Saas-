import time
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import CustomField
from ..schemas import CustomFieldOut, CustomFieldCreate, CustomFieldUpdate

router = APIRouter(prefix="/custom-fields", tags=["custom-fields"])


@router.get("", response_model=list[CustomFieldOut])
def list_custom_fields(org_id: str = Query(...), db: Session = Depends(get_db)):
    return (
        db.query(CustomField)
        .filter(CustomField.organization_id == org_id)
        .order_by(CustomField.sort_order, CustomField.id)
        .all()
    )


@router.post("", response_model=CustomFieldOut, status_code=201)
def create_custom_field(body: CustomFieldCreate, db: Session = Depends(get_db)):
    field = CustomField(
        id=f"cf_{int(time.time() * 1000)}",
        **body.model_dump(by_alias=False),
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.put("/{field_id}", response_model=CustomFieldOut)
def update_custom_field(field_id: str, body: CustomFieldUpdate, db: Session = Depends(get_db)):
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(404, "Custom field not found")
    for key, value in body.model_dump(by_alias=False, exclude_none=True).items():
        setattr(field, key, value)
    db.commit()
    db.refresh(field)
    return field


@router.delete("/{field_id}", status_code=204)
def delete_custom_field(field_id: str, db: Session = Depends(get_db)):
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(404, "Custom field not found")
    db.delete(field)
    db.commit()
