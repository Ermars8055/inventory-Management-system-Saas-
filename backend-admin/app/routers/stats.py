from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_tenant_db
from ..dependencies import require
from ..models import AdminUser

router = APIRouter(prefix="/stats", tags=["admin-stats"])


@router.get("")
def global_stats(
    admin: AdminUser = Depends(require("stats:read")),
    tenant_db: Session = Depends(get_tenant_db),
):
    orgs      = tenant_db.execute(text("SELECT COUNT(*) FROM organizations")).scalar()
    items     = tenant_db.execute(text("SELECT COUNT(*) FROM items")).scalar()
    recipients = tenant_db.execute(text("SELECT COUNT(*) FROM recipients")).scalar()
    assignments = tenant_db.execute(text("SELECT COUNT(*) FROM assignments")).scalar()
    active_assignments = tenant_db.execute(text("SELECT COUNT(*) FROM assignments WHERE status = 'issued'")).scalar()

    plan_breakdown = tenant_db.execute(text(
        "SELECT plan, COUNT(*) as count FROM organizations GROUP BY plan"
    )).fetchall()

    industry_breakdown = tenant_db.execute(text(
        "SELECT industry, COUNT(*) as count FROM organizations GROUP BY industry"
    )).fetchall()

    return {
        "totalOrgs": orgs,
        "totalItems": items,
        "totalRecipients": recipients,
        "totalAssignments": assignments,
        "activeAssignments": active_assignments,
        "planBreakdown": [dict(r._mapping) for r in plan_breakdown],
        "industryBreakdown": [dict(r._mapping) for r in industry_breakdown],
    }
