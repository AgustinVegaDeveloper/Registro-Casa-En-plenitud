from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.auth import Role, UserCellAccess, UserRole
from app.models.cell import Cell
from app.models.network import Network, NetworkAdvisor
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def get_users(db: Session) -> list[dict[str, object]]:
    users = db.query(User).order_by(User.username.asc()).all()
    return [_user_to_dict(db, user) for user in users]


def get_user_by_id(db: Session, user_id: int) -> dict[str, object] | None:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return None
    return _user_to_dict(db, user)


def _user_to_dict(db: Session, user: User) -> dict[str, object]:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "role_codes": [ur.role.code for ur in user.roles] if user.roles else [],
    }


def create_user(db: Session, payload: UserCreate) -> User:
    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, payload: UserUpdate) -> User:
    if payload.email is not None:
        user.email = payload.email
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")
    user.hashed_password = get_password_hash(new_password)
    db.commit()


def admin_set_password(db: Session, user: User, new_password: str) -> None:
    user.hashed_password = get_password_hash(new_password)
    db.commit()


def assign_role(db: Session, user: User, role_code: str) -> list[str]:
    role = db.query(Role).filter(Role.code == role_code).first()
    if role is None:
        raise ValueError(f"Role '{role_code}' not found")
    existing = db.query(UserRole).filter(UserRole.user_id == user.id, UserRole.role_id == role.id).first()
    if existing:
        return [ur.role.code for ur in user.roles]
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    db.refresh(user)
    return [ur.role.code for ur in user.roles]


def remove_role(db: Session, user: User, role_code: str) -> list[str]:
    role = db.query(Role).filter(Role.code == role_code).first()
    if role is None:
        raise ValueError(f"Role '{role_code}' not found")
    user_role = db.query(UserRole).filter(UserRole.user_id == user.id, UserRole.role_id == role.id).first()
    if user_role:
        db.delete(user_role)
        db.commit()
    db.refresh(user)
    return [ur.role.code for ur in user.roles]


def get_network_advisors(db: Session, user: User) -> list[dict[str, object]]:
    advisors = (
        db.query(NetworkAdvisor)
        .filter(NetworkAdvisor.user_id == user.id)
        .all()
    )
    results: list[dict[str, object]] = []
    for advisor in advisors:
        network = db.query(Network).filter(Network.id == advisor.network_id).first()
        results.append({
            "id": advisor.id,
            "network_id": advisor.network_id,
            "network_name": network.name if network else "Unknown",
            "advisor_slot": advisor.advisor_slot,
        })
    return results


def assign_network_advisor(db: Session, user: User, network_id: int) -> dict[str, object]:
    network = db.query(Network).filter(Network.id == network_id).first()
    if network is None:
        raise ValueError("Network not found")

    existing = db.query(NetworkAdvisor).filter(NetworkAdvisor.network_id == network_id, NetworkAdvisor.user_id == user.id).first()
    if existing:
        raise ValueError("User is already an advisor for this network")

    current_advisors = db.query(NetworkAdvisor).filter(NetworkAdvisor.network_id == network_id).count()
    if current_advisors >= 2:
        raise ValueError("Network already has 2 advisors")

    next_slot = current_advisors + 1
    advisor = NetworkAdvisor(network_id=network_id, user_id=user.id, advisor_slot=next_slot)
    db.add(advisor)
    db.commit()
    return {"network_id": network_id, "network_name": network.name, "advisor_slot": next_slot}


def remove_network_advisor(db: Session, user: User, network_id: int) -> None:
    advisor = db.query(NetworkAdvisor).filter(NetworkAdvisor.network_id == network_id, NetworkAdvisor.user_id == user.id).first()
    if advisor:
        db.delete(advisor)
        db.commit()


def get_cell_accesses(db: Session, user: User) -> list[dict[str, object]]:
    accesses = (
        db.query(UserCellAccess)
        .filter(UserCellAccess.user_id == user.id)
        .all()
    )
    results: list[dict[str, object]] = []
    for access in accesses:
        cell = db.query(Cell).filter(Cell.id == access.cell_id).first()
        role = db.query(Role).filter(Role.id == access.role_id).first()
        results.append({
            "id": access.id,
            "cell_id": access.cell_id,
            "cell_code": cell.code if cell else "Unknown",
            "role_code": role.code if role else "",
            "role_name": role.name if role else "",
        })
    return results


def assign_cell_access(db: Session, user: User, cell_id: int, role_code: str) -> dict[str, object]:
    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if cell is None:
        raise ValueError("Cell not found")
    role = db.query(Role).filter(Role.code == role_code).first()
    if role is None:
        raise ValueError(f"Role '{role_code}' not found")

    existing = db.query(UserCellAccess).filter(UserCellAccess.user_id == user.id, UserCellAccess.cell_id == cell_id).first()
    if existing:
        raise ValueError("User already has access to this cell")

    access = UserCellAccess(user_id=user.id, cell_id=cell_id, role_id=role.id)
    db.add(access)
    db.commit()
    return {"id": access.id, "cell_id": cell_id, "cell_code": cell.code, "role_code": role.code, "role_name": role.name}


def remove_cell_access(db: Session, user: User, access_id: int) -> None:
    access = db.query(UserCellAccess).filter(UserCellAccess.id == access_id, UserCellAccess.user_id == user.id).first()
    if access:
        db.delete(access)
        db.commit()
