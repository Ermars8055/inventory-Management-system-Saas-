import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# Admin app's own DB (stores admin users, audit log)
_admin_dir = os.path.dirname(os.path.abspath(__file__))
_default_admin_db = os.path.normpath(os.path.join(_admin_dir, "..", "admin.db"))
_default_tenant_db = os.path.normpath(os.path.join(_admin_dir, "..", "..", "stockpilot.db"))

ADMIN_DB_URL = os.getenv("ADMIN_DB_URL", f"sqlite:///{_default_admin_db}")

# Tenant DB — read for org stats/impersonation (same SQLite file as main app)
TENANT_DB_URL = os.getenv("TENANT_DB_URL", f"sqlite:///{_default_tenant_db}")

_kwargs = {"check_same_thread": False}

admin_engine = create_engine(ADMIN_DB_URL, connect_args=_kwargs)
tenant_engine = create_engine(TENANT_DB_URL, connect_args=_kwargs)

AdminSession = sessionmaker(autocommit=False, autoflush=False, bind=admin_engine)
TenantSession = sessionmaker(autocommit=False, autoflush=False, bind=tenant_engine)


class AdminBase(DeclarativeBase):
    pass


def get_admin_db():
    db = AdminSession()
    try:
        yield db
    finally:
        db.close()


def get_tenant_db():
    db = TenantSession()
    try:
        yield db
    finally:
        db.close()
