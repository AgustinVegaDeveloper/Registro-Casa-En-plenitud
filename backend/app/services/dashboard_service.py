from datetime import date

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord, Meeting
from app.models.cell import Cell
from app.models.member import Member
from app.models.network import Network


def get_dashboard_summary(db: Session) -> dict[str, object]:
    today = date.today()
    monthly_attendance = (
        db.query(func.count(AttendanceRecord.id))
        .join(Meeting, Meeting.id == AttendanceRecord.meeting_id)
        .filter(
            func.year(Meeting.meeting_date) == today.year,
            func.month(Meeting.meeting_date) == today.month,
        )
        .scalar()
    )

    last_weekend = (
        db.query(Meeting)
        .filter(Meeting.meeting_type == "weekend_service")
        .order_by(Meeting.meeting_date.desc())
        .first()
    )
    last_weekend_presents = 0
    last_weekend_lates = 0
    last_weekend_total = 0
    last_weekend_date = None
    if last_weekend:
        last_weekend_date = last_weekend.meeting_date
        stats = (
            db.query(
                func.count(AttendanceRecord.id).label("total"),
                func.sum(case((AttendanceRecord.status == "P", 1), else_=0)).label("presents"),
                func.sum(case((AttendanceRecord.status == "R", 1), else_=0)).label("lates"),
            )
            .filter(AttendanceRecord.meeting_id == last_weekend.id)
            .one()
        )
        last_weekend_total = int(stats.total or 0)
        last_weekend_presents = int(stats.presents or 0)
        last_weekend_lates = int(stats.lates or 0)

    return {
        "total_networks": db.query(func.count(Network.id)).scalar() or 0,
        "total_cells": db.query(func.count(Cell.id)).scalar() or 0,
        "total_members": db.query(func.count(Member.id)).scalar() or 0,
        "monthly_attendance": monthly_attendance or 0,
        "last_weekend_date": last_weekend_date,
        "last_weekend_presents": last_weekend_presents,
        "last_weekend_lates": last_weekend_lates,
        "last_weekend_total": last_weekend_total,
    }


def get_monthly_attendance(db: Session, year: int) -> list[dict[str, object]]:
    rows = (
        db.query(
            func.extract("month", Meeting.meeting_date).label("month"),
            func.count(AttendanceRecord.id).label("total_records"),
            func.sum(case((AttendanceRecord.status == "P", 1), else_=0)).label("presents"),
            func.sum(case((AttendanceRecord.status == "R", 1), else_=0)).label("lates"),
            func.sum(case((AttendanceRecord.status == "E", 1), else_=0)).label("excused"),
            func.sum(case((AttendanceRecord.status == "N", 1), else_=0)).label("absents"),
        )
        .join(Meeting, Meeting.id == AttendanceRecord.meeting_id)
        .filter(func.year(Meeting.meeting_date) == year)
        .group_by(func.extract("month", Meeting.meeting_date))
        .order_by(func.extract("month", Meeting.meeting_date))
        .all()
    )
    return [
        {
            "year": year,
            "month": int(row.month),
            "total_records": int(row.total_records or 0),
            "presents": int(row.presents or 0),
            "lates": int(row.lates or 0),
            "excused": int(row.excused or 0),
            "absents": int(row.absents or 0),
        }
        for row in rows
    ]


def get_attendance_by_network(db: Session, period_start: date, period_end: date) -> list[dict[str, object]]:
    rows = (
        db.query(
            Network.id.label("network_id"),
            Network.name.label("network_name"),
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
    return _build_entity_rows(rows)


def get_attendance_by_cell(db: Session, period_start: date, period_end: date) -> list[dict[str, object]]:
    rows = (
        db.query(
            Cell.id.label("cell_id"),
            Cell.code.label("cell_code"),
            func.coalesce(Cell.name, "").label("cell_name"),
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
    return _build_entity_rows(rows)


def _build_entity_rows(rows) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    for row in rows:
        total_records = int(row.total_records or 0)
        presents = int(row.presents or 0)
        lates = int(row.lates or 0)
        excused = int(row.excused or 0)
        absents = int(row.absents or 0)
        attendance_rate = round(((presents + lates + excused) / total_records) * 100, 2) if total_records else 0.0
        item: dict[str, object] = {"total_records": total_records, "presents": presents, "lates": lates, "excused": excused, "absents": absents, "attendance_rate": attendance_rate}
        for col in ("network_id", "network_name", "cell_id", "cell_code", "cell_name"):
            if hasattr(row, col):
                item[col] = getattr(row, col)
        results.append(item)
    return results
