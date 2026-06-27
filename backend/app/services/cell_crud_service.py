from datetime import date
from sqlalchemy.orm import Session

from app.models.cell import Cell
from app.models.member import Member
from app.models.membership import CellMemberRole, CellMembership, ChurchRole
from app.models.network import Network
from app.schemas.cell import CellCreate, CellUpdate
from app.schemas.cell_member import CellMemberRead
from app.schemas.cell_role import CellRoleRead
from app.schemas.cell_role_assignment import CellRoleAssignmentCreate, CellRoleAssignmentRead


def next_cell_number(db: Session, network_id: int) -> int:
    latest_cell = (
        db.query(Cell)
        .filter(Cell.network_id == network_id)
        .order_by(Cell.cell_number.desc())
        .first()
    )
    return 1 if latest_cell is None else latest_cell.cell_number + 1


def build_cell_code(network_number: int, cell_number: int) -> str:
    return f"{network_number}.{cell_number}"


def get_cells(db: Session) -> list[Cell]:
    return db.query(Cell).order_by(Cell.network_id.asc(), Cell.cell_number.asc()).all()


def get_cell_by_id(db: Session, cell_id: int) -> Cell | None:
    return db.query(Cell).filter(Cell.id == cell_id).first()


def create_cell(db: Session, payload: CellCreate) -> Cell:
    network = db.query(Network).filter(Network.id == payload.network_id).first()
    if network is None:
        raise ValueError("Network not found")

    cell_number = next_cell_number(db, payload.network_id)
    cell = Cell(
        network_id=payload.network_id,
        cell_number=cell_number,
        code=build_cell_code(network.network_number, cell_number),
        name=payload.name,
        is_active=payload.is_active,
    )
    db.add(cell)
    db.commit()
    db.refresh(cell)
    return cell


def update_cell(db: Session, cell: Cell, payload: CellUpdate) -> Cell:
    if payload.name is not None:
        cell.name = payload.name
    if payload.is_active is not None:
        cell.is_active = payload.is_active

    db.commit()
    db.refresh(cell)
    return cell


def delete_cell(db: Session, cell: Cell) -> None:
    db.delete(cell)
    db.commit()


def get_cell_members(db: Session, cell_id: int) -> list[CellMemberRead]:
    memberships = (
        db.query(CellMembership)
        .join(Member, Member.id == CellMembership.member_id)
        .filter(CellMembership.cell_id == cell_id, CellMembership.end_date.is_(None))
        .order_by(Member.last_name.asc(), Member.first_name.asc())
        .all()
    )
    return [
        CellMemberRead(
            member_id=membership.member_id,
            membership_id=membership.id,
            document=membership.member.document,
            first_name=membership.member.first_name,
            last_name=membership.member.last_name,
            phone=membership.member.phone,
            neighborhood=membership.member.neighborhood,
            is_active_membership=membership.end_date is None,
        )
        for membership in memberships
    ]


def get_cell_roles(db: Session, cell_id: int) -> list[CellRoleRead]:
    assignments = (
        db.query(CellMemberRole)
        .join(CellMembership, CellMembership.id == CellMemberRole.membership_id)
        .join(Member, Member.id == CellMembership.member_id)
        .join(CellMemberRole.role)
        .filter(CellMembership.cell_id == cell_id, CellMemberRole.end_date.is_(None))
        .order_by(Member.last_name.asc(), Member.first_name.asc())
        .all()
    )
    return [
        CellRoleRead(
            membership_id=assignment.membership_id,
            member_id=assignment.membership.member_id,
            member_name=f"{assignment.membership.member.first_name} {assignment.membership.member.last_name}",
            role_code=assignment.role.code,
            role_name=assignment.role.name,
            start_date=assignment.start_date,
            end_date=assignment.end_date,
        )
        for assignment in assignments
    ]


def list_cell_role_assignments(db: Session, cell_id: int) -> list[CellRoleAssignmentRead]:
    assignments = (
        db.query(CellMemberRole)
        .join(CellMembership, CellMembership.id == CellMemberRole.membership_id)
        .join(Member, Member.id == CellMembership.member_id)
        .join(CellMemberRole.role)
        .filter(CellMembership.cell_id == cell_id)
        .order_by(CellMemberRole.end_date.is_(None).desc(), Member.last_name.asc(), Member.first_name.asc())
        .all()
    )
    return [
        CellRoleAssignmentRead(
            id=assignment.id,
            membership_id=assignment.membership_id,
            role_id=assignment.role_id,
            role_code=assignment.role.code,
            role_name=assignment.role.name,
            start_date=assignment.start_date,
            end_date=assignment.end_date,
        )
        for assignment in assignments
    ]


def assign_cell_role(db: Session, cell_id: int, payload: CellRoleAssignmentCreate) -> CellMemberRole:
    membership = db.query(CellMembership).filter(CellMembership.id == payload.membership_id).first()
    if membership is None:
        raise ValueError("Membership not found")
    if membership.cell_id != cell_id:
        raise ValueError("Membership does not belong to the cell")

    role = db.query(ChurchRole).filter(ChurchRole.code == payload.role_code).first()
    if role is None:
        raise ValueError("Role not found")

    if membership.end_date is not None and payload.start_date > membership.end_date:
        raise ValueError("Role start date cannot be later than the membership end date")

    existing = (
        db.query(CellMemberRole)
        .filter(
            CellMemberRole.membership_id == payload.membership_id,
            CellMemberRole.role_id == role.id,
            CellMemberRole.end_date.is_(None),
        )
        .first()
    )
    if existing is not None:
        raise ValueError("Role already assigned")

    assignment = CellMemberRole(
        membership_id=payload.membership_id,
        role_id=role.id,
        start_date=payload.start_date,
        end_date=None,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def close_cell_role(db: Session, assignment: CellMemberRole, end_date: date) -> CellMemberRole:
    if end_date < assignment.start_date:
        raise ValueError("End date cannot be earlier than start date")
    assignment.end_date = end_date
    db.commit()
    db.refresh(assignment)
    return assignment
