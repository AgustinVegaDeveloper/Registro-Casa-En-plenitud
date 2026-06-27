from datetime import date

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord, Meeting
from app.models.member import Member
from app.models.membership import CellMembership
from app.schemas.attendance import AttendanceBatchCreate, AttendanceRosterItem, MeetingCreate
from app.services.attendance_service import validate_membership_belongs_to_meeting_cell


def get_meetings(db: Session) -> list[Meeting]:
    return db.query(Meeting).order_by(Meeting.meeting_date.desc(), Meeting.id.desc()).all()


def get_meeting_by_id(db: Session, meeting_id: int) -> Meeting | None:
    return db.query(Meeting).filter(Meeting.id == meeting_id).first()


def create_meeting(db: Session, payload: MeetingCreate) -> Meeting:
    meeting = Meeting(
        cell_id=payload.cell_id,
        meeting_type=payload.meeting_type,
        meeting_date=payload.meeting_date,
        notes=payload.notes,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def get_attendance_records_for_meeting(db: Session, meeting_id: int) -> list[AttendanceRecord]:
    return db.query(AttendanceRecord).filter(AttendanceRecord.meeting_id == meeting_id).all()


def normalize_excuse_fields(status: str, excuse_reason, excuse_text: str | None) -> tuple[object | None, str | None]:
    if status != "E":
        return None, None
    if excuse_reason is None and not excuse_text:
        raise ValueError("Excuse reason or excuse text is required when status is E")
    return excuse_reason, excuse_text


def create_or_update_attendance_batch(db: Session, payload: AttendanceBatchCreate) -> list[AttendanceRecord]:
    meeting = get_meeting_by_id(db, payload.meeting_id)
    if meeting is None:
        raise ValueError("Meeting not found")

    records_by_membership = {
        record.membership_id: record for record in get_attendance_records_for_meeting(db, payload.meeting_id)
    }

    results: list[AttendanceRecord] = []
    for item in payload.items:
        membership = db.query(CellMembership).filter(CellMembership.id == item.membership_id).first()
        if membership is None:
            raise ValueError("Membership not found")
        if membership.start_date > meeting.meeting_date or (
            membership.end_date is not None and membership.end_date < meeting.meeting_date
        ):
            raise ValueError("Membership is not active on the meeting date")
        if not validate_membership_belongs_to_meeting_cell(meeting, membership):
            raise ValueError("Membership does not belong to the meeting cell")

        excuse_reason, excuse_text = normalize_excuse_fields(item.status.value, item.excuse_reason, item.excuse_text)

        record = records_by_membership.get(item.membership_id)
        if record is None:
            record = AttendanceRecord(
                meeting_id=payload.meeting_id,
                member_id=membership.member_id,
                membership_id=item.membership_id,
                status=item.status,
                excuse_reason=excuse_reason,
                excuse_text=excuse_text,
            )
            db.add(record)
        else:
            record.status = item.status
            record.excuse_reason = excuse_reason
            record.excuse_text = excuse_text

        results.append(record)

    db.commit()
    for record in results:
        db.refresh(record)
    return results


def get_meeting_roster(db: Session, meeting_id: int) -> list[AttendanceRosterItem]:
    meeting = get_meeting_by_id(db, meeting_id)
    if meeting is None:
        return []

    memberships = (
        db.query(CellMembership)
        .join(Member, Member.id == CellMembership.member_id)
        .filter(
            CellMembership.cell_id == meeting.cell_id,
            CellMembership.start_date <= meeting.meeting_date,
            or_(CellMembership.end_date.is_(None), CellMembership.end_date >= meeting.meeting_date),
        )
        .all()
    )
    records = {record.membership_id: record for record in get_attendance_records_for_meeting(db, meeting_id)}

    roster: list[AttendanceRosterItem] = []
    for membership in memberships:
        record = records.get(membership.id)
        roster.append(
            AttendanceRosterItem(
                membership_id=membership.id,
                member_id=membership.member_id,
                document=membership.member.document,
                full_name=f"{membership.member.first_name} {membership.member.last_name}",
                status=record.status if record else None,
                excuse_reason=record.excuse_reason if record else None,
                excuse_text=record.excuse_text if record else None,
            )
        )

    return roster
