"""
Signup flow — creates org + admin user + subdomain in one step.
Calls GoDaddy API to register subdomain DNS record.
"""
import os
import re
import time
import requests
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from ..database import get_db
from ..models import Organization, User
from ..auth import hash_password, create_access_token
from ..email_service import send_welcome

router = APIRouter(prefix="/signup", tags=["signup"])

GODADDY_KEY = os.getenv("GODADDY_API_KEY", "")
GODADDY_SECRET = os.getenv("GODADDY_API_SECRET", "")
DOMAIN = os.getenv("TENANT_DOMAIN", "ermarscastar.in")
SUBDOMAIN_BASE = os.getenv("SUBDOMAIN_BASE", "stockpilot")
VPS_IP = os.getenv("VPS_IP", "187.127.217.155")


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SignupBody(_Camel):
    org_name: str
    industry: str
    subdomain: str
    name: str
    email: str
    password: str
    enabled_modules: list[str] = []


def _sanitize_subdomain(s: str) -> str:
    """Lowercase, alphanumeric + hyphens only."""
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9-]', '', s.replace(' ', '-'))
    s = re.sub(r'-+', '-', s).strip('-')
    return s


def _create_dns_record(subdomain: str):
    """Create A record via GoDaddy API: {subdomain}.stockpilot.ermarscastar.in → VPS_IP"""
    if not GODADDY_KEY or not GODADDY_SECRET:
        return  # Skip in dev if no API keys

    record_name = f"{subdomain}.{SUBDOMAIN_BASE}"
    url = f"https://api.godaddy.com/v1/domains/{DOMAIN}/records/A/{record_name}"
    headers = {
        "Authorization": f"sso-key {GODADDY_KEY}:{GODADDY_SECRET}",
        "Content-Type": "application/json",
    }

    # Check if record already exists
    resp = requests.get(url, headers=headers)
    if resp.status_code == 200 and resp.json():
        return  # Already exists

    # Create the record
    resp = requests.put(url, headers=headers, json=[{"data": VPS_IP, "ttl": 600}])
    if resp.status_code not in (200, 201):
        raise HTTPException(500, f"Failed to create DNS record: {resp.text}")


@router.post("")
def signup(body: SignupBody, db: Session = Depends(get_db)):
    subdomain = _sanitize_subdomain(body.subdomain)
    if not subdomain or len(subdomain) < 3:
        raise HTTPException(400, "Subdomain must be at least 3 characters")
    if len(subdomain) > 30:
        raise HTTPException(400, "Subdomain must be 30 characters or less")

    # Check subdomain uniqueness
    existing = db.query(Organization).filter(Organization.subdomain == subdomain).first()
    if existing:
        raise HTTPException(409, "Subdomain already taken")

    # Check email uniqueness
    existing_user = db.query(User).filter(User.email == body.email).first()
    if existing_user:
        raise HTTPException(409, "Email already registered")

    # Create org
    org_id = f"org_{int(time.time() * 1000)}"
    # Industry-specific default config
    INDUSTRY_CONFIGS = {
        "school": {
            "recipientLabel": "Student", "recipientPluralLabel": "Students",
            "identifierLabel": "Roll Number", "groupLabel": "Class",
            "assignmentLabel": "Issue", "assignmentMode": "distribution",
            "itemUnit": "units", "currencyCode": "INR", "currencySymbol": "₹",
            "timezone": "Asia/Kolkata", "language": "en",
            "enableFines": False, "enableConditionTracking": True, "fineLabel": "Fine",
        },
        "pharmacy": {
            "recipientLabel": "Customer", "recipientPluralLabel": "Customers",
            "identifierLabel": "Customer ID", "groupLabel": "Area",
            "assignmentLabel": "Sale", "assignmentMode": "distribution",
            "itemUnit": "strips", "currencyCode": "INR", "currencySymbol": "₹",
            "timezone": "Asia/Kolkata", "language": "en",
            "enableFines": False, "enableConditionTracking": False, "fineLabel": "Fine",
        },
        "retail": {
            "recipientLabel": "Customer", "recipientPluralLabel": "Customers",
            "identifierLabel": "Customer ID", "groupLabel": "Region",
            "assignmentLabel": "Sale", "assignmentMode": "distribution",
            "itemUnit": "units", "currencyCode": "INR", "currencySymbol": "₹",
            "timezone": "Asia/Kolkata", "language": "en",
            "enableFines": False, "enableConditionTracking": False, "fineLabel": "Fine",
        },
    }
    DEFAULT_CONFIG = {
        "recipientLabel": "Recipient", "recipientPluralLabel": "Recipients",
        "identifierLabel": "ID", "groupLabel": "Group",
        "assignmentLabel": "Issue", "assignmentMode": "distribution",
        "itemUnit": "units", "currencyCode": "INR", "currencySymbol": "₹",
        "timezone": "Asia/Kolkata", "language": "en",
        "enableFines": False, "enableConditionTracking": True, "fineLabel": "Fine",
    }

    org_config = INDUSTRY_CONFIGS.get(body.industry, DEFAULT_CONFIG)

    org = Organization(
        id=org_id,
        name=body.org_name,
        industry=body.industry,
        enabled_modules=body.enabled_modules or ["inventory", "reports"],
        plan="starter",
        subdomain=subdomain,
        logo_text=body.org_name[:3].upper(),
        created_at=date.today().isoformat(),
        config=org_config,
    )
    db.add(org)

    # Create admin user
    user = User(
        id=f"usr_{int(time.time() * 1000)}",
        organization_id=org_id,
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role="org_admin",
        status="active",
    )
    db.add(user)
    db.commit()

    # Create DNS record + send welcome email
    _create_dns_record(subdomain)
    email_sent = send_welcome(body.email, body.name, body.org_name, subdomain)

    # Generate JWT token
    token = create_access_token({
        "sub": user.id,
        "org_id": org_id,
        "role": "org_admin",
    })

    full_domain = f"{subdomain}.{SUBDOMAIN_BASE}.{DOMAIN}"

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": "org_admin",
            "organizationId": org_id,
        },
        "organization": {
            "id": org_id,
            "name": org.name,
            "subdomain": subdomain,
            "domain": full_domain,
        },
        "emailSent": email_sent,
    }


@router.get("/check-subdomain")
def check_subdomain(subdomain: str, db: Session = Depends(get_db)):
    """Check if a subdomain is available."""
    clean = _sanitize_subdomain(subdomain)
    if not clean or len(clean) < 3:
        return {"available": False, "reason": "Too short (min 3 characters)"}
    existing = db.query(Organization).filter(Organization.subdomain == clean).first()
    return {"available": not existing, "subdomain": clean}
