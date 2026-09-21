"""
Default custom fields for each module.
Auto-created when module is enabled (via signup or Modules page).
Shared between signup.py and organizations.py.
"""
import time
from sqlalchemy.orm import Session
from .models import CustomField

MODULE_DEFAULT_FIELDS = {
    "uniforms": [
        {"name": "Class", "type": "text", "sort_order": 0},
        {"name": "Gender", "type": "dropdown", "options": ["Male", "Female", "Unisex"], "sort_order": 1},
        {"name": "Size", "type": "text", "sort_order": 2},
        {"name": "Academic Year", "type": "text", "sort_order": 3},
        {"name": "Uniform Type", "type": "text", "sort_order": 4},
    ],
    "books": [
        {"name": "ISBN", "type": "text", "sort_order": 0},
        {"name": "Subject", "type": "text", "sort_order": 1},
        {"name": "Class", "type": "text", "sort_order": 2},
        {"name": "Academic Year", "type": "text", "sort_order": 3},
        {"name": "Edition", "type": "text", "sort_order": 4},
        {"name": "Publisher", "type": "text", "sort_order": 5},
    ],
    "pharmacy": [
        {"name": "Generic Name", "type": "text", "sort_order": 0},
        {"name": "Manufacturer", "type": "text", "sort_order": 1},
        {"name": "Batch Number", "type": "text", "sort_order": 2},
        {"name": "Expiry Date", "type": "date", "sort_order": 3},
        {"name": "Manufacturing Date", "type": "date", "sort_order": 4},
        {"name": "MRP", "type": "number", "sort_order": 5},
        {"name": "Prescription Required", "type": "boolean", "sort_order": 6},
    ],
}


def create_module_fields(db: Session, org_id: str, modules: list[str]):
    """Auto-create default custom fields for the given modules if they don't exist yet."""
    ts = int(time.time() * 1000)
    for mod in modules:
        if mod not in MODULE_DEFAULT_FIELDS:
            continue
        existing = db.query(CustomField).filter(
            CustomField.organization_id == org_id,
            CustomField.entity == "item",
            CustomField.module == mod,
        ).count()
        if existing > 0:
            continue
        for i, field_def in enumerate(MODULE_DEFAULT_FIELDS[mod]):
            db.add(CustomField(
                id=f"cf_auto_{mod}_{i}_{ts}",
                organization_id=org_id,
                name=field_def["name"],
                type=field_def["type"],
                entity="item",
                module=mod,
                options=field_def.get("options"),
                required=False,
                sort_order=field_def.get("sort_order", i),
            ))
        ts += 1
