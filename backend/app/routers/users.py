import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role
from ..schemas import UserOut, RoleOut, RoleUpdate, UserCreate, UserUpdate
from ..dependencies import require, same_org, get_current_user, check_limit
from ..rbac import ROLE_PERMISSIONS, ROLE_NAMES
from ..auth import hash_password
from ..audit import log_action

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserOut])
def list_users(user: User = Depends(require("users:read")), db: Session = Depends(get_db)):
    return db.query(User).filter(User.organization_id == user.organization_id).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    same_org(body.organization_id, user)
    check_limit("users", user, db)
    existing = db.query(User).filter(
        User.organization_id == user.organization_id,
        User.email == body.email,
    ).first()
    if existing:
        raise HTTPException(409, "A user with this email already exists in this organization")
    new_user = User(
        id=f"usr_{int(time.time() * 1000)}",
        organization_id=user.organization_id,
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password) if body.password else hash_password("changeme"),
        role=body.role,
        status="active",
        last_active=None,
    )
    db.add(new_user)
    log_action(db, user, "create", "user", new_user.id,
               f"Created user: {body.name} ({body.email}) role={body.role}")
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: str, body: UserUpdate, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    same_org(target.organization_id, user)
    changes = body.model_dump(exclude_none=True, by_alias=False)
    before = {k: getattr(target, k) for k in changes}
    for field, value in changes.items():
        setattr(target, field, value)
    log_action(db, user, "update", "user", target.id,
               f"Updated user: {target.name}", before=before, after=changes)
    db.commit()
    db.refresh(target)
    return target


@router.patch("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: str, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    same_org(target.organization_id, user)
    if target.id == user.id:
        raise HTTPException(400, "Cannot deactivate yourself")
    target.status = "inactive"
    log_action(db, user, "deactivate", "user", target.id,
               f"Deactivated user: {target.name} ({target.email})")
    db.commit()
    db.refresh(target)
    return target


@router.patch("/users/{user_id}/activate", response_model=UserOut)
def activate_user(user_id: str, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    same_org(target.organization_id, user)
    target.status = "active"
    log_action(db, user, "activate", "user", target.id,
               f"Activated user: {target.name} ({target.email})")
    db.commit()
    db.refresh(target)
    return target


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, user: User = Depends(require("users:manage")), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    same_org(target.organization_id, user)
    if target.id == user.id:
        raise HTTPException(400, "Cannot delete yourself")
    if target.role == "org_admin":
        admin_count = db.query(User).filter(
            User.organization_id == user.organization_id,
            User.role == "org_admin",
            User.status == "active",
        ).count()
        if admin_count <= 1:
            raise HTTPException(400, "Cannot delete the last organization admin")
    log_action(db, user, "delete", "user", target.id,
               f"Deleted user: {target.name} ({target.email}) role={target.role}")
    db.delete(target)
    db.commit()


@router.get("/roles", response_model=list[RoleOut])
def list_roles(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    standard_roles = [
        {"id": "org_admin", "name": "Organization Admin"},
        {"id": "manager", "name": "Manager"},
        {"id": "staff", "name": "Staff"},
        {"id": "viewer", "name": "Viewer"},
    ]
    # Fetch custom roles for this organization
    custom_roles = {}
    for r in db.query(Role).filter(Role.organization_id == user.organization_id).all():
        key = r.id.replace(f"{user.organization_id}_", "")
        custom_roles[key] = r

    result = []
    for r in standard_roles:
        role_key = r["id"]
        if role_key in custom_roles:
            result.append(RoleOut(
                id=role_key,
                name=custom_roles[role_key].name or r["name"],
                permissions=custom_roles[role_key].permissions or [],
            ))
        else:
            result.append(RoleOut(
                id=role_key,
                name=r["name"],
                permissions=ROLE_PERMISSIONS.get(role_key, []),
            ))
    return result


@router.put("/roles/{role_id}", response_model=RoleOut)
def update_role(
    role_id: str,
    body: RoleUpdate,
    user: User = Depends(require("users:manage")),
    db: Session = Depends(get_db),
):
    if role_id == "org_admin":
        raise HTTPException(400, "Organization Admin permissions cannot be modified")
    if role_id not in ROLE_NAMES:
        raise HTTPException(400, f"Unknown role '{role_id}'. Valid roles: manager, staff, viewer")

    # Search for existing role record for this org
    role_record = db.query(Role).filter(
        Role.organization_id == user.organization_id,
        Role.id.in_([f"{user.organization_id}_{role_id}", role_id]),
    ).first()

    if not role_record:
        role_record = Role(
            id=f"{user.organization_id}_{role_id}",
            organization_id=user.organization_id,
            name=ROLE_NAMES[role_id],
            permissions=body.permissions,
        )
        db.add(role_record)
    else:
        role_record.permissions = body.permissions

    log_action(db, user, "update_role", "role", role_id,
               f"Updated permissions for role '{role_id}': {len(body.permissions)} permissions granted")
    db.commit()
    db.refresh(role_record)

    return RoleOut(
        id=role_id,
        name=ROLE_NAMES[role_id],
        permissions=role_record.permissions,
    )
