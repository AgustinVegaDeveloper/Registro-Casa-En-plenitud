from sqlalchemy.orm import Session

from app.models.auth import UserCellAccess
from app.models.cell import Cell
from app.models.user import User
from app.services.auth_service import get_user_role_codes


def user_is_admin(user: User) -> bool:
    return "admin" in get_user_role_codes(user)


def can_access_network(db: Session, user: User, network_id: int) -> bool:
    if user_is_admin(user):
        return True

    role_codes = set(get_user_role_codes(user))
    if "advisor" in role_codes:
        return any(advisor.network_id == network_id for advisor in user.advisor_networks)

    if "leader" in role_codes or "collaborator" in role_codes:
        return (
            db.query(UserCellAccess)
            .join(Cell, Cell.id == UserCellAccess.cell_id)
            .filter(UserCellAccess.user_id == user.id, Cell.network_id == network_id)
            .first()
            is not None
        )

    return False


def can_access_cell(db: Session, user: User, cell_id: int) -> bool:
    if user_is_admin(user):
        return True

    role_codes = set(get_user_role_codes(user))
    if "advisor" in role_codes:
        return (
            db.query(Cell)
            .filter(
                Cell.id == cell_id,
                Cell.network_id.in_([advisor.network_id for advisor in user.advisor_networks]),
            )
            .first()
            is not None
        )

    if "leader" in role_codes or "collaborator" in role_codes:
        return (
            db.query(UserCellAccess)
            .filter(UserCellAccess.user_id == user.id, UserCellAccess.cell_id == cell_id)
            .first()
            is not None
        )

    return False
