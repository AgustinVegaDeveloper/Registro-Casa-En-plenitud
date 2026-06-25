from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.user import User


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username, User.is_active.is_(True)).first()
    if not user:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_role_codes(user: User) -> list[str]:
    return [user_role.role.code for user_role in user.roles]


def user_has_any_role(user: User, allowed_roles: set[str]) -> bool:
    return any(role_code in allowed_roles for role_code in get_user_role_codes(user))
