from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_advisor
from app.schemas.report import ReportScopeItemRead
from app.services.report_service import get_attendance_by_cell, get_attendance_by_member, get_attendance_by_network

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/attendance/by-member", response_model=list[ReportScopeItemRead], dependencies=[Depends(require_advisor)])
def attendance_by_member(
    period: str = Query(default="month"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db_session),
):
    return get_attendance_by_member(db, period, start_date, end_date)


@router.get("/attendance/by-cell", response_model=list[ReportScopeItemRead], dependencies=[Depends(require_advisor)])
def attendance_by_cell(
    period: str = Query(default="month"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db_session),
):
    return get_attendance_by_cell(db, period, start_date, end_date)


@router.get("/attendance/by-network", response_model=list[ReportScopeItemRead], dependencies=[Depends(require_advisor)])
def attendance_by_network(
    period: str = Query(default="month"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db_session),
):
    return get_attendance_by_network(db, period, start_date, end_date)

