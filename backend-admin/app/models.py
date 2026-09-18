from sqlalchemy import Column, String, Boolean, Text, Integer, Float
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


class Coupon(AdminBase):
    __tablename__ = "coupons"
    id = Column(String, primary_key=True)
    code = Column(String, nullable=False, unique=True)
    discount_type = Column(String, nullable=False)  # "percent" | "flat"
    discount_value = Column(Float, nullable=False)   # e.g. 20 (%) or 500 (₹)
    applicable_plans = Column(String)                # comma-separated: "starter,professional" or "all"
    max_uses = Column(Integer, default=0)            # 0 = unlimited
    uses_count = Column(Integer, default=0)
    valid_from = Column(String)
    valid_until = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(String)


class OrgCoupon(AdminBase):
    __tablename__ = "org_coupons"
    id = Column(String, primary_key=True)
    org_id = Column(String, nullable=False)
    coupon_id = Column(String, nullable=False)
    coupon_code = Column(String, nullable=False)
    discount_type = Column(String, nullable=False)
    discount_value = Column(Float, nullable=False)
    applied_at = Column(String)


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
