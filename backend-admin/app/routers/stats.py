from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_tenant_db, get_admin_db
from ..dependencies import require
from ..models import AdminUser, Invoice

router = APIRouter(prefix="/stats", tags=["admin-stats"])

PLAN_PRICES = {"starter": 999, "professional": 2999, "enterprise": 7999}


@router.get("")
def global_stats(
    admin: AdminUser = Depends(require("stats:read")),
    tenant_db: Session = Depends(get_tenant_db),
    admin_db: Session = Depends(get_admin_db),
):
    orgs      = tenant_db.execute(text("SELECT COUNT(*) FROM organizations")).scalar()
    items     = tenant_db.execute(text("SELECT COUNT(*) FROM items")).scalar()
    recipients = tenant_db.execute(text("SELECT COUNT(*) FROM recipients")).scalar()
    assignments = tenant_db.execute(text("SELECT COUNT(*) FROM assignments")).scalar()
    active_assignments = tenant_db.execute(text("SELECT COUNT(*) FROM assignments WHERE status = 'issued'")).scalar()
    vendors   = tenant_db.execute(text("SELECT COUNT(*) FROM vendors")).scalar()

    plan_breakdown = tenant_db.execute(text(
        "SELECT plan, COUNT(*) as count FROM organizations GROUP BY plan"
    )).fetchall()

    industry_breakdown = tenant_db.execute(text(
        "SELECT industry, COUNT(*) as count FROM organizations GROUP BY industry"
    )).fetchall()

    # Revenue stats from invoices
    mrr = 0
    plan_rows = tenant_db.execute(text("SELECT plan FROM organizations")).fetchall()
    for row in plan_rows:
        mrr += PLAN_PRICES.get(row.plan or "starter", 999)

    total_revenue = admin_db.query(Invoice).filter(Invoice.status == "paid").count()
    paid_amount = 0
    paid_invoices = admin_db.query(Invoice).filter(Invoice.status == "paid").all()
    for inv in paid_invoices:
        paid_amount += inv.final_amount or 0

    pending_amount = 0
    pending_invoices = admin_db.query(Invoice).filter(Invoice.status == "pending").all()
    for inv in pending_invoices:
        pending_amount += inv.final_amount or 0

    overdue_amount = 0
    overdue_invoices = admin_db.query(Invoice).filter(Invoice.status == "overdue").all()
    for inv in overdue_invoices:
        overdue_amount += inv.final_amount or 0

    return {
        "totalOrgs": orgs,
        "totalItems": items,
        "totalRecipients": recipients,
        "totalAssignments": assignments,
        "activeAssignments": active_assignments,
        "totalVendors": vendors,
        "planBreakdown": [dict(r._mapping) for r in plan_breakdown],
        "industryBreakdown": [dict(r._mapping) for r in industry_breakdown],
        "mrr": mrr,
        "paidRevenue": paid_amount,
        "pendingRevenue": pending_amount,
        "overdueRevenue": overdue_amount,
    }
