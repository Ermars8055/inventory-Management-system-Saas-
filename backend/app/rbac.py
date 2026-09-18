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


def has_permission(role: str, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, [])
    return "*" in perms or permission in perms
