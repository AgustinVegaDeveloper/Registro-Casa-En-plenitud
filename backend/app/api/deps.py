from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import TokenPayload
from app.services.auth_service import get_user_by_id, user_has_any_role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def get_db_session(db: Session = Depends(get_db)) -> Session:
    return db


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = TokenPayload(**decode_token(token))
    except (JWTError, ValidationError, ValueError):
        raise credentials_exception

    user_id = int(payload.sub)
    user = get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise credentials_exception

    return user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    allowed_role_set = set(allowed_roles)

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not user_has_any_role(current_user, allowed_role_set):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return dependency


require_admin = require_roles("admin")
require_advisor = require_roles("admin", "advisor")
require_leader = require_roles("admin", "leader")
require_collaborator = require_roles("admin", "collaborator")
