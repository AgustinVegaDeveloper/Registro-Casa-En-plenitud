from datetime import date, timedelta
from io import BytesIO

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord, Meeting
from app.models.cell import Cell
from app.models.member import Member
from app.models.membership import CellMembership
from app.models.network import Network


def resolve_period(period: str, start_date: date | None, end_date: date | None) -> tuple[date, date]:
    today = date.today()
    if period == "today":
        return today, today
    if period == "week":
        return today - timedelta(days=today.weekday()), today
    if period == "month":
        return today.replace(day=1), today
    if period == "quarter":
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        return today.replace(month=quarter_start_month, day=1), today
    if period == "semester":
        semester_start_month = 1 if today.month <= 6 else 7
        return today.replace(month=semester_start_month, day=1), today
    if period == "year":
        return today.replace(month=1, day=1), today
    if start_date is None or end_date is None:
        raise ValueError("Custom period requires start_date and end_date")
    if end_date < start_date:
        raise ValueError("end_date cannot be earlier than start_date")
    return start_date, end_date


def get_attendance_summary(db: Session, period: str, start_date: date | None, end_date: date | None) -> dict[str, object]:
    period_start, period_end = resolve_period(period, start_date, end_date)
    query = (
        db.query(
            func.count(AttendanceRecord.id).label("total_records"),
            func.sum(case((AttendanceRecord.status == "P", 1), else_=0)).label("presents"),
            func.sum(case((AttendanceRecord.status == "R", 1), else_=0)).label("lates"),
            func.sum(case((AttendanceRecord.status == "E", 1), else_=0)).label("excused"),
            func.sum(case((AttendanceRecord.status == "N", 1), else_=0)).label("absents"),
            func.count(func.distinct(Meeting.id)).label("total_meetings"),
        )
        .join(Meeting, Meeting.id == AttendanceRecord.meeting_id)
        .filter(Meeting.meeting_date >= period_start, Meeting.meeting_date <= period_end)
    )
    row = query.one()
    total_records = int(row.total_records or 0)
    presents = int(row.presents or 0)
    lates = int(row.lates or 0)
    excused = int(row.excused or 0)
    absents = int(row.absents or 0)
    attendance_rate = round(((presents + lates + excused) / total_records) * 100, 2) if total_records else 0.0
    return {
        "period_start": period_start,
        "period_end": period_end,
        "total_meetings": int(row.total_meetings or 0),
        "total_records": total_records,
        "presents": presents,
        "lates": lates,
        "excused": excused,
        "absents": absents,
        "attendance_rate": attendance_rate,
    }


def _build_scope_rows(rows) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    for row in rows:
        total_records = int(row.total_records or 0)
        presents = int(row.presents or 0)
        lates = int(row.lates or 0)
        excused = int(row.excused or 0)
        absents = int(row.absents or 0)
        attendance_rate = round(((presents + lates + excused) / total_records) * 100, 2) if total_records else 0.0
        results.append(
            {
                "entity_id": int(row.entity_id),
                "entity_name": str(row.entity_name),
                "total_meetings": int(row.total_meetings or 0),
                "total_records": total_records,
                "presents": presents,
                "lates": lates,
                "excused": excused,
                "absents": absents,
                "attendance_rate": attendance_rate,
            }
        )
    return results


def get_attendance_by_cell(db: Session, period: str, start_date: date | None, end_date: date | None) -> list[dict[str, object]]:
    period_start, period_end = resolve_period(period, start_date, end_date)
    rows = (
        db.query(
            Cell.id.label("entity_id"),
            func.concat(Cell.code, " - ", func.coalesce(Cell.name, "Sin nombre")).label("entity_name"),
            func.count(func.distinct(Meeting.id)).label("total_meetings"),
            func.count(AttendanceRecord.id).label("total_records"),
            func.sum(case((AttendanceRecord.status == "P", 1), else_=0)).label("presents"),
            func.sum(case((AttendanceRecord.status == "R", 1), else_=0)).label("lates"),
            func.sum(case((AttendanceRecord.status == "E", 1), else_=0)).label("excused"),
            func.sum(case((AttendanceRecord.status == "N", 1), else_=0)).label("absents"),
        )
        .join(Meeting, Meeting.cell_id == Cell.id)
        .join(AttendanceRecord, AttendanceRecord.meeting_id == Meeting.id)
        .filter(Meeting.meeting_date >= period_start, Meeting.meeting_date <= period_end)
        .group_by(Cell.id)
        .order_by(Cell.code.asc())
        .all()
    )
    return _build_scope_rows(rows)


def get_attendance_by_network(db: Session, period: str, start_date: date | None, end_date: date | None) -> list[dict[str, object]]:
    period_start, period_end = resolve_period(period, start_date, end_date)
    rows = (
        db.query(
            Network.id.label("entity_id"),
            func.concat(Network.network_number, " - ", Network.name).label("entity_name"),
            func.count(func.distinct(Meeting.id)).label("total_meetings"),
            func.count(AttendanceRecord.id).label("total_records"),
            func.sum(case((AttendanceRecord.status == "P", 1), else_=0)).label("presents"),
            func.sum(case((AttendanceRecord.status == "R", 1), else_=0)).label("lates"),
            func.sum(case((AttendanceRecord.status == "E", 1), else_=0)).label("excused"),
            func.sum(case((AttendanceRecord.status == "N", 1), else_=0)).label("absents"),
        )
        .join(Cell, Cell.network_id == Network.id)
        .join(Meeting, Meeting.cell_id == Cell.id)
        .join(AttendanceRecord, AttendanceRecord.meeting_id == Meeting.id)
        .filter(Meeting.meeting_date >= period_start, Meeting.meeting_date <= period_end)
        .group_by(Network.id)
        .order_by(Network.network_number.asc())
        .all()
    )
    return _build_scope_rows(rows)


def get_attendance_by_member(db: Session, period: str, start_date: date | None, end_date: date | None) -> list[dict[str, object]]:
    period_start, period_end = resolve_period(period, start_date, end_date)
    rows = (
        db.query(
            Member.id.label("entity_id"),
            func.concat(Member.first_name, " ", Member.last_name).label("entity_name"),
            func.count(func.distinct(Meeting.id)).label("total_meetings"),
            func.count(AttendanceRecord.id).label("total_records"),
            func.sum(case((AttendanceRecord.status == "P", 1), else_=0)).label("presents"),
            func.sum(case((AttendanceRecord.status == "R", 1), else_=0)).label("lates"),
            func.sum(case((AttendanceRecord.status == "E", 1), else_=0)).label("excused"),
            func.sum(case((AttendanceRecord.status == "N", 1), else_=0)).label("absents"),
        )
        .join(AttendanceRecord, AttendanceRecord.member_id == Member.id)
        .join(Meeting, Meeting.id == AttendanceRecord.meeting_id)
        .filter(Meeting.meeting_date >= period_start, Meeting.meeting_date <= period_end)
        .group_by(Member.id)
        .order_by(Member.last_name.asc(), Member.first_name.asc())
        .all()
    )
    return _build_scope_rows(rows)


def get_attendance_report_export_data(
    db: Session,
    scope: str,
    period: str,
    start_date: date | None,
    end_date: date | None,
) -> tuple[dict[str, object], list[dict[str, object]]]:
    summary = get_attendance_summary(db, period, start_date, end_date)
    if scope == "cell":
        rows = get_attendance_by_cell(db, period, start_date, end_date)
    elif scope == "network":
        rows = get_attendance_by_network(db, period, start_date, end_date)
    else:
        rows = get_attendance_by_member(db, period, start_date, end_date)
    return summary, rows
