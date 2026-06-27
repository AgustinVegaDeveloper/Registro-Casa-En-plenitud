from datetime import date

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.cell import Cell
from app.models.member import Member
from app.models.membership import CellMembership
from app.schemas.membership import CellMembershipCreate, CellMembershipTransfer


def get_memberships(db: Session) -> list[CellMembership]:
    return db.query(CellMembership).order_by(CellMembership.start_date.desc(), CellMembership.id.desc()).all()


def get_memberships_for_member(db: Session, member_id: int) -> list[CellMembership]:
    return (
        db.query(CellMembership)
        .filter(CellMembership.member_id == member_id)
        .order_by(CellMembership.start_date.desc(), CellMembership.id.desc())
        .all()
    )


def get_active_membership_for_member(db: Session, member_id: int) -> CellMembership | None:
    return (
        db.query(CellMembership)
        .filter(CellMembership.member_id == member_id, CellMembership.end_date.is_(None))
        .first()
    )


def get_membership_active_on_date(db: Session, member_id: int, on_date: date) -> CellMembership | None:
    return (
        db.query(CellMembership)
        .filter(
            CellMembership.member_id == member_id,
            CellMembership.start_date <= on_date,
            or_(CellMembership.end_date.is_(None), CellMembership.end_date >= on_date),
        )
        .order_by(CellMembership.start_date.desc(), CellMembership.id.desc())
        .first()
    )


def get_membership_by_id(db: Session, membership_id: int) -> CellMembership | None:
    return db.query(CellMembership).filter(CellMembership.id == membership_id).first()


def validate_membership_dates(start_date: date, end_date: date | None) -> None:
    if end_date is not None and end_date < start_date:
        raise ValueError("End date cannot be earlier than start date")


def create_membership(db: Session, payload: CellMembershipCreate) -> CellMembership:
    member = db.query(Member).filter(Member.id == payload.member_id).first()
    if member is None:
        raise ValueError("Member not found")

    cell = db.query(Cell).filter(Cell.id == payload.cell_id).first()
    if cell is None:
        raise ValueError("Cell not found")

    validate_membership_dates(payload.start_date, payload.end_date)

    active_membership = get_active_membership_for_member(db, payload.member_id)
    if active_membership is not None:
        raise ValueError("Member already has an active membership")

    membership = CellMembership(
        member_id=payload.member_id,
        cell_id=payload.cell_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def close_membership(db: Session, membership: CellMembership, end_date: date) -> CellMembership:
    if end_date < membership.start_date:
        raise ValueError("End date cannot be earlier than start date")

    membership.end_date = end_date
    db.commit()
    db.refresh(membership)
    return membership


def transfer_member_to_cell(
    db: Session,
    current_membership: CellMembership,
    payload: CellMembershipTransfer,
) -> CellMembership:
    if payload.transfer_date < current_membership.start_date:
        raise ValueError("Transfer date cannot be earlier than the current membership start date")

    if current_membership.end_date is not None and payload.transfer_date > current_membership.end_date:
        raise ValueError("Transfer date cannot be later than the current membership end date")

    if payload.target_cell_id == current_membership.cell_id:
        raise ValueError("Target cell must be different from the current cell")

    target_cell = db.query(Cell).filter(Cell.id == payload.target_cell_id).first()
    if target_cell is None:
        raise ValueError("Target cell not found")

    current_membership.end_date = payload.transfer_date

    new_membership = CellMembership(
        member_id=current_membership.member_id,
        cell_id=payload.target_cell_id,
        start_date=payload.transfer_date,
        end_date=None,
    )

    db.add(new_membership)
    db.commit()
    db.refresh(current_membership)
    db.refresh(new_membership)
    return new_membership


def delete_membership(db: Session, membership: CellMembership) -> None:
    db.delete(membership)
    db.commit()
