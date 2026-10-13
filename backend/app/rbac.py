# ─── Permission constants ────────────────────────────────────────────────────

class P:
    # Inventory
    INVENTORY_READ   = "inventory:read"
    INVENTORY_CREATE = "inventory:create"
    INVENTORY_UPDATE = "inventory:update"
    INVENTORY_DELETE = "inventory:delete"

    # Assignments / issuance
    ASSIGNMENTS_READ   = "assignments:read"
    ASSIGNMENTS_CREATE = "assignments:create"
    ASSIGNMENTS_UPDATE = "assignments:update"
    ASSIGNMENTS_DELETE = "assignments:delete"

    # Recipients
    RECIPIENTS_READ   = "recipients:read"
    RECIPIENTS_CREATE = "recipients:create"
    RECIPIENTS_UPDATE = "recipients:update"
    RECIPIENTS_DELETE = "recipients:delete"

    # Vendors
    VENDORS_READ   = "vendors:read"
    VENDORS_CREATE = "vendors:create"
    VENDORS_UPDATE = "vendors:update"
    VENDORS_DELETE = "vendors:delete"

    # Reports / transactions
    REPORTS_READ       = "reports:read"
    TRANSACTIONS_READ  = "transactions:read"

    # Settings & org config
    SETTINGS_READ   = "settings:read"
    SETTINGS_UPDATE = "settings:update"

    # Users & roles
    USERS_READ   = "users:read"
    USERS_MANAGE = "users:manage"


# ─── Role → permission mapping ───────────────────────────────────────────────

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "org_admin": ["*"],   # wildcard = all permissions
    "manager": [
        P.INVENTORY_READ, P.INVENTORY_CREATE, P.INVENTORY_UPDATE,
        P.ASSIGNMENTS_READ, P.ASSIGNMENTS_CREATE, P.ASSIGNMENTS_UPDATE,
        P.RECIPIENTS_READ, P.RECIPIENTS_CREATE, P.RECIPIENTS_UPDATE,
        P.VENDORS_READ, P.VENDORS_CREATE, P.VENDORS_UPDATE,
        P.REPORTS_READ, P.TRANSACTIONS_READ,
        P.SETTINGS_READ,
        P.USERS_READ,
    ],
    "staff": [
        P.INVENTORY_READ,
        P.ASSIGNMENTS_READ, P.ASSIGNMENTS_CREATE, P.ASSIGNMENTS_UPDATE,
        P.RECIPIENTS_READ,
        P.TRANSACTIONS_READ,
    ],
    "viewer": [
        P.INVENTORY_READ,
        P.ASSIGNMENTS_READ,
        P.RECIPIENTS_READ,
        P.VENDORS_READ,
        P.REPORTS_READ,
        P.TRANSACTIONS_READ,
    ],
}


ROLE_NAMES: dict[str, str] = {
    "org_admin": "Organization Admin",
    "manager": "Manager",
    "staff": "Staff",
    "viewer": "Viewer",
}


def get_role_permissions(role: str, org_id: str | None = None, db = None) -> list[str]:
    """Get effective permissions for a role, checking org overrides in db first."""
    if role == "org_admin":
        return ["*"]
    if org_id and db:
        try:
            from .models import Role
            role_record = db.query(Role).filter(
                Role.organization_id == org_id,
                Role.id.in_([f"{org_id}_{role}", role]),
            ).first()
            if role_record and role_record.permissions is not None:
                return role_record.permissions
        except Exception:
            pass
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(role: str, permission: str, org_id: str | None = None, db = None) -> bool:
    if role == "org_admin":
        return True
    perms = get_role_permissions(role, org_id, db)
    return "*" in perms or permission in perms
