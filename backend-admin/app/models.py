from sqlalchemy import Column, String, Boolean, Text, Integer
from .database import AdminBase


class AdminUser(AdminBase):
    __tablename__ = "admin_users"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    # super_admin | support | billing_admin
    role = Column(String, nullable=False, default="support")
    is_active = Column(Boolean, default=True)
    created_at = Column(String)
    last_login = Column(String)


class AuditLog(AdminBase):
    __tablename__ = "audit_log"
    id = Column(String, primary_key=True)
    admin_id = Column(String)
    admin_email = Column(String)
    action = Column(String, nullable=False)   # e.g. "suspend_org", "impersonate"
    target_type = Column(String)              # "org" | "admin_user"
    target_id = Column(String)
    detail = Column(Text)
    created_at = Column(String)
