from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, require_collaborator, require_leader
from app.models.user import User
from app.schemas.membership import CellMembershipClose, CellMembershipCreate, CellMembershipRead, CellMembershipTransfer
from app.services.authorization_service import can_access_cell
from app.services.membership_crud_service import (
    close_membership,
    create_membership,
    delete_membership,
    get_active_membership_for_member,
    get_membership_by_id,
    get_memberships,
    get_memberships_for_member,
    transfer_member_to_cell,
)

router = APIRouter(prefix="/memberships", tags=["memberships"])


@router.get("", response_model=list[CellMembershipRead], dependencies=[Depends(require_leader)])
def list_memberships(db: Session = Depends(get_db_session)):
    return get_memberships(db)


@router.get("/member/{member_id}", response_model=list[CellMembershipRead], dependencies=[Depends(require_leader)])
def list_member_history(member_id: int, db: Session = Depends(get_db_session)):
    return get_memberships_for_member(db, member_id)


@router.post("", response_model=CellMembershipRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_collaborator)])
def create_membership_endpoint(
    payload: CellMembershipCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    if not can_access_cell(db, current_user, payload.cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    try:
        return create_membership(db, payload)
    except ValueError as exc:
        message = str(exc)
        if message in {"Member not found", "Cell not found"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        if message == "Member already has an active membership":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)
        if message == "End date cannot be earlier than start date":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)
        raise


@router.post("/{membership_id}/close", response_model=CellMembershipRead, dependencies=[Depends(require_leader)])
def close_membership_endpoint(
    membership_id: int,
    payload: CellMembershipClose,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    membership = get_membership_by_id(db, membership_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    if not can_access_cell(db, current_user, membership.cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    try:
        return close_membership(db, membership, payload.end_date)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@router.post("/{membership_id}/transfer", response_model=CellMembershipRead, dependencies=[Depends(require_leader)])
def transfer_membership_endpoint(
    membership_id: int,
    payload: CellMembershipTransfer,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    membership = get_membership_by_id(db, membership_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    if not can_access_cell(db, current_user, membership.cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    if not can_access_cell(db, current_user, payload.target_cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to the target cell")
    try:
        return transfer_member_to_cell(db, membership, payload)
    except ValueError as exc:
        message = str(exc)
        if message == "Target cell not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_leader)])
def delete_membership_endpoint(
    membership_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    membership = get_membership_by_id(db, membership_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    if not can_access_cell(db, current_user, membership.cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    delete_membership(db, membership)
