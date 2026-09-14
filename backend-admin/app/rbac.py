ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super_admin": ["*"],
    "support": [
        "orgs:read", "orgs:impersonate",
        "admin_users:read",
        "audit:read",
        "stats:read",
    ],
    "billing_admin": [
        "orgs:read", "orgs:billing",
        "stats:read",
    ],
}


def has_permission(role: str, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, [])
    return "*" in perms or permission in perms
