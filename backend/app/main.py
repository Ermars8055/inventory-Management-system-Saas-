import os
import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .database import engine, Base, SessionLocal
from .models import Organization
from .auth import decode_token
from .routers import (
    organizations,
    inventory,
    categories,
    transactions,
    users,
    issuance,
    batches,
    templates,
    custom_fields,
    subscriptions,
    procurement,
    maintenance,
)
from .routers.asset_router import router as asset_router
from .routers.auth_router import router as auth_router
from .routers.class_templates import router as class_templates_router
from .routers.quotations import router as quotations_router
from .routers.vendors import router as vendors_router
from .routers.support import router as support_router
from .routers.signup import router as signup_router
from .routers.data_io import router as data_io_router
from .routers.search import router as search_router

load_dotenv()

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StockPilot API", version="1.0.0")

SUBDOMAIN_BASE = os.getenv("SUBDOMAIN_BASE", "stockpilot")
TENANT_DOMAIN = os.getenv("TENANT_DOMAIN", "ermarscastar.in")
SUBDOMAIN_SUFFIX = f".{SUBDOMAIN_BASE}.{TENANT_DOMAIN}"

# Paths completely exempt from subdomain middleware (no org lookup at all)
SKIP_SUBDOMAIN_PATHS = {"/health", "/signup", "/signup/check-subdomain",
                        "/subscriptions", "/subscriptions/plans",
                        "/auth/forgot-password", "/auth/reset-password"}


# ─── Subdomain enforcement middleware ────────────────────────────────────────

class SubdomainMiddleware(BaseHTTPMiddleware):
    """
    Extracts subdomain from Host header (e.g. abcschool.stockpilot.ermarscastar.in).
    If a subdomain is present:
      - Looks up the org by subdomain
      - For authenticated requests, verifies user belongs to that org
      - Blocks access if mismatch
    Requests to the main domain (no subdomain) pass through normally.
    """

    async def dispatch(self, request: Request, call_next):
        host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(":")[0].lower()
        path = request.url.path

        # Skip for paths that don't need any subdomain logic
        if path in SKIP_SUBDOMAIN_PATHS or path.startswith("/docs") or path.startswith("/openapi"):
            return await call_next(request)

        # Extract subdomain
        subdomain = None
        if host.endswith(SUBDOMAIN_SUFFIX):
            subdomain = host[: -len(SUBDOMAIN_SUFFIX)]

        if not subdomain:
            # Main domain or localhost — no subdomain enforcement
            return await call_next(request)

        # Look up org by subdomain
        db: Session = SessionLocal()
        try:
            org = db.query(Organization).filter(Organization.subdomain == subdomain).first()
            if not org:
                return JSONResponse(status_code=404, content={"detail": f"Organization not found for subdomain: {subdomain}"})

            # If request has auth token, verify user belongs to this org
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                payload = decode_token(token)
                user_org_id = payload.get("org_id")
                if not user_org_id:
                    # Fallback: look up user's org from DB
                    from .models import User
                    user = db.query(User).filter(User.id == payload.get("sub")).first()
                    user_org_id = user.organization_id if user else None

                if user_org_id and user_org_id != org.id:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Access denied: your account does not belong to this organization"}
                    )

            # Store org info in request state for routes to use
            request.state.subdomain_org_id = org.id
            request.state.subdomain = subdomain
        finally:
            db.close()

        return await call_next(request)


# ─── CORS — allow subdomains + configured origins ────────────────────────────

static_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8060").split(",") if o.strip()]

app.add_middleware(SubdomainMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=rf"https?://([a-z0-9-]+\.)?{re.escape(SUBDOMAIN_BASE)}\.{re.escape(TENANT_DOMAIN)}",
    allow_origins=static_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(organizations.router)
app.include_router(inventory.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(users.router)
app.include_router(issuance.router)
app.include_router(batches.router)
app.include_router(templates.router)
app.include_router(custom_fields.router)
app.include_router(subscriptions.router)
app.include_router(procurement.router)
app.include_router(maintenance.router)
app.include_router(asset_router)
app.include_router(class_templates_router)
app.include_router(quotations_router)
app.include_router(vendors_router)
app.include_router(support_router)
app.include_router(signup_router)
app.include_router(data_io_router)
app.include_router(search_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "StockPilot API"}
