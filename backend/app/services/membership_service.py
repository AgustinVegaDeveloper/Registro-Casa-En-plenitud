from sqlalchemy.orm import Session

from app.models.membership import CellMembership


def get_active_membership_for_member(db: Session, member_id: int) -> CellMembership | None:
    return (
        db.query(CellMembership)
        .filter(CellMembership.member_id == member_id, CellMembership.end_date.is_(None))
        .first()
    )


def get_membership_by_id(db: Session, membership_id: int) -> CellMembership | None:
    return db.query(CellMembership).filter(CellMembership.id == membership_id).first()


def validate_membership_is_active(membership: CellMembership) -> bool:
    return membership.end_date is None
