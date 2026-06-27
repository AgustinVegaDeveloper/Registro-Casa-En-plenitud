from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, require_advisor, require_leader
from app.models.membership import CellMemberRole
from app.models.user import User
from app.schemas.cell import CellCreate, CellRead, CellUpdate
from app.schemas.cell_member import CellMemberRead
from app.schemas.cell_role import CellRoleRead
from app.schemas.cell_role_assignment import CellRoleAssignmentCreate, CellRoleAssignmentRead
from app.services.authorization_service import can_access_cell, can_access_network
from app.services.cell_crud_service import (
    assign_cell_role,
    create_cell,
    delete_cell,
    get_cell_by_id,
    get_cell_members,
    get_cell_roles,
    get_cells,
    list_cell_role_assignments,
    update_cell,
)

router = APIRouter(prefix="/cells", tags=["cells"])


@router.get("", response_model=list[CellRead], dependencies=[Depends(require_advisor)])
def list_cells(db: Session = Depends(get_db_session)):
    return get_cells(db)


@router.get("/{cell_id}", response_model=CellRead)
def read_cell(
    cell_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    cell = get_cell_by_id(db, cell_id)
    if cell is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cell not found")
    if not can_access_cell(db, current_user, cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    return cell


@router.get("/{cell_id}/members", response_model=list[CellMemberRead], dependencies=[Depends(require_leader)])
def read_cell_members(
    cell_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    cell = get_cell_by_id(db, cell_id)
    if cell is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cell not found")
    if not can_access_cell(db, current_user, cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    return get_cell_members(db, cell_id)


@router.get("/{cell_id}/roles", response_model=list[CellRoleRead], dependencies=[Depends(require_leader)])
def read_cell_roles(
    cell_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    cell = get_cell_by_id(db, cell_id)
    if cell is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cell not found")
    if not can_access_cell(db, current_user, cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    return get_cell_roles(db, cell_id)


@router.get("/{cell_id}/role-assignments", response_model=list[CellRoleAssignmentRead], dependencies=[Depends(require_leader)])
def read_cell_role_assignments(
    cell_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    cell = get_cell_by_id(db, cell_id)
    if cell is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cell not found")
    if not can_access_cell(db, current_user, cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    return list_cell_role_assignments(db, cell_id)


@router.post("/{cell_id}/role-assignments", response_model=CellRoleAssignmentRead, dependencies=[Depends(require_leader)])
def create_cell_role_assignment(
    cell_id: int,
    payload: CellRoleAssignmentCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    if not can_access_cell(db, current_user, cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    try:
        assignment = assign_cell_role(db, cell_id, payload)
        return CellRoleAssignmentRead(
            id=assignment.id,
            membership_id=assignment.membership_id,
            role_id=assignment.role_id,
            role_code=assignment.role.code,
            role_name=assignment.role.name,
            start_date=assignment.start_date,
            end_date=assignment.end_date,
        )
    except ValueError as exc:
        message = str(exc)
        if message in {"Membership not found", "Role not found"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)




@router.post("", response_model=CellRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_advisor)])
def create_cell_endpoint(
    payload: CellCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    if not can_access_network(db, current_user, payload.network_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this network")
    try:
        return create_cell(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.put("/{cell_id}", response_model=CellRead, dependencies=[Depends(require_leader)])
def update_cell_endpoint(
    cell_id: int,
    payload: CellUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    cell = get_cell_by_id(db, cell_id)
    if cell is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cell not found")
    if not can_access_cell(db, current_user, cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    return update_cell(db, cell, payload)


@router.delete("/{cell_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_advisor)])
def delete_cell_endpoint(
    cell_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    cell = get_cell_by_id(db, cell_id)
    if cell is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cell not found")
    if not can_access_cell(db, current_user, cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    delete_cell(db, cell)
