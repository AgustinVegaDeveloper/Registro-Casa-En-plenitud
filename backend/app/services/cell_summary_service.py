from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord, Meeting
from app.models.cell import Cell
from app.models.membership import CellMembership


def get_cell_summary(db: Session, cell_id: int) -> dict[str, object] | None:
    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if cell is None:
        return None

    total_members = (
        db.query(func.count(CellMembership.id))
        .filter(CellMembership.cell_id == cell_id, CellMembership.end_date.is_(None))
        .scalar()
        or 0
    )

    latest_meeting_date = db.query(func.max(Meeting.meeting_date)).filter(Meeting.cell_id == cell_id).scalar()

    attendance_query = (
        db.query(
            func.count(AttendanceRecord.id).label("total_attendance_records"),
            func.sum(case((AttendanceRecord.status == "P", 1), else_=0)).label("presents"),
            func.sum(case((AttendanceRecord.status == "R", 1), else_=0)).label("lates"),
            func.sum(case((AttendanceRecord.status == "E", 1), else_=0)).label("excused"),
            func.sum(case((AttendanceRecord.status == "N", 1), else_=0)).label("absents"),
        )
        .join(Meeting, Meeting.id == AttendanceRecord.meeting_id)
        .filter(Meeting.cell_id == cell_id)
    )

    attendance_row = attendance_query.one()

    return {
        "cell_id": cell.id,
        "cell_code": cell.code,
        "cell_name": cell.name,
        "total_members": total_members,
        "presents": int(attendance_row.presents or 0),
        "lates": int(attendance_row.lates or 0),
        "excused": int(attendance_row.excused or 0),
        "absents": int(attendance_row.absents or 0),
        "total_attendance_records": int(attendance_row.total_attendance_records or 0),
        "latest_meeting_date": latest_meeting_date.isoformat() if latest_meeting_date else None,
    }

