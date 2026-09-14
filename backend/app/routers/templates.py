from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ReceiptTemplate
from ..schemas import ReceiptTemplateOut, ReceiptTemplateUpdate

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[ReceiptTemplateOut])
def list_templates(org_id: str = Query(...), db: Session = Depends(get_db)):
    return db.query(ReceiptTemplate).filter(ReceiptTemplate.organization_id == org_id).all()


@router.put("/{template_id}", response_model=ReceiptTemplateOut)
def update_template(template_id: str, body: ReceiptTemplateUpdate, db: Session = Depends(get_db)):
    tpl = db.query(ReceiptTemplate).filter(ReceiptTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(404, "Template not found")
    for field, value in body.model_dump(exclude_none=True, by_alias=False).items():
        setattr(tpl, field, value)
    db.commit()
    db.refresh(tpl)
    return tpl
