from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, require_collaborator, require_leader
from app.models.user import User
from app.schemas.attendance import AttendanceBatchCreate, AttendanceRead, AttendanceRosterItem, MeetingCreate, MeetingRead
from app.services.authorization_service import can_access_cell
from app.services.attendance_crud_service import (
    create_meeting,
    create_or_update_attendance_batch,
    get_attendance_records_for_meeting,
    get_meeting_by_id,
    get_meeting_roster,
    get_meetings,
)

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("/meetings", response_model=list[MeetingRead], dependencies=[Depends(require_leader)])
def list_meetings(db: Session = Depends(get_db_session)):
    return get_meetings(db)


@router.post("/meetings", response_model=MeetingRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_leader)])
def create_meeting_endpoint(
    payload: MeetingCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    if not can_access_cell(db, current_user, payload.cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    return create_meeting(db, payload)


@router.get("/meetings/{meeting_id}/records", response_model=list[AttendanceRead], dependencies=[Depends(require_leader)])
def list_meeting_records(
    meeting_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    meeting = get_meeting_by_id(db, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    if not can_access_cell(db, current_user, meeting.cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    return get_attendance_records_for_meeting(db, meeting_id)


@router.get("/meetings/{meeting_id}/roster", response_model=list[AttendanceRosterItem], dependencies=[Depends(require_leader)])
def list_meeting_roster(
    meeting_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    meeting = get_meeting_by_id(db, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    if not can_access_cell(db, current_user, meeting.cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    return get_meeting_roster(db, meeting_id)


@router.post("/meetings/batch", response_model=list[AttendanceRead], dependencies=[Depends(require_collaborator)])
def create_or_update_batch_endpoint(
    payload: AttendanceBatchCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    meeting = get_meeting_by_id(db, payload.meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    if not can_access_cell(db, current_user, meeting.cell_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this cell")
    try:
        return create_or_update_attendance_batch(db, payload)
    except ValueError as exc:
        message = str(exc)
        if message in {"Meeting not found", "Membership not found"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)
