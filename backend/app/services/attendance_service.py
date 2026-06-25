from sqlalchemy.orm import Session

from app.models.attendance import Meeting
from app.models.membership import CellMembership


def get_meeting_by_id(db: Session, meeting_id: int) -> Meeting | None:
    return db.query(Meeting).filter(Meeting.id == meeting_id).first()


def validate_membership_belongs_to_meeting_cell(meeting: Meeting, membership: CellMembership) -> bool:
    return meeting.cell_id == membership.cell_id
