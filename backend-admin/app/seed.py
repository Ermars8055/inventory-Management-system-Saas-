"""Seed the admin database. Run: python -m app.seed"""
from .database import admin_engine, AdminBase, AdminSession
from .models import AdminUser, AuditLog
from .auth import hash_password
import uuid
from datetime import datetime

AdminBase.metadata.create_all(bind=admin_engine)


def seed():
    db = AdminSession()
    if db.query(AdminUser).count() > 0:
        print("Admin DB already seeded — skipping.")
        db.close()
        return

    db.add_all([
        AdminUser(
            id=str(uuid.uuid4()),
            name="Super Admin",
            email="admin@stockpilot.com",
            password_hash=hash_password("admin123"),
            role="super_admin",
            is_active=True,
            created_at=datetime.utcnow().isoformat(),
        ),
        AdminUser(
            id=str(uuid.uuid4()),
            name="Support Agent",
            email="support@stockpilot.com",
            password_hash=hash_password("support123"),
            role="support",
            is_active=True,
            created_at=datetime.utcnow().isoformat(),
        ),
        AdminUser(
            id=str(uuid.uuid4()),
            name="Billing Manager",
            email="billing@stockpilot.com",
            password_hash=hash_password("billing123"),
            role="billing_admin",
            is_active=True,
            created_at=datetime.utcnow().isoformat(),
        ),
    ])
    db.commit()
    db.close()
    print("✓ Admin DB seeded.")


if __name__ == "__main__":
    seed()

seed()
