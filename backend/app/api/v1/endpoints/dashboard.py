from datetime import date
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_collaborator
from app.schemas.dashboard import (
    AttendanceByCellItem,
    AttendanceByNetworkItem,
    DashboardSummaryRead,
    MonthlyAttendanceItem,
)
from app.services.dashboard_service import (
    get_attendance_by_cell,
    get_attendance_by_network,
    get_dashboard_summary,
    get_monthly_attendance,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryRead, dependencies=[Depends(require_collaborator)])
def read_dashboard_summary(db: Session = Depends(get_db_session)):
    return get_dashboard_summary(db)


@router.get("/monthly-attendance", response_model=List[MonthlyAttendanceItem], dependencies=[Depends(require_collaborator)])
def read_monthly_attendance(
    year: int = Query(default=None, description="Year to query, defaults to current year"),
    db: Session = Depends(get_db_session),
):
    if year is None:
        year = date.today().year
    return get_monthly_attendance(db, year)


@router.get("/by-network", response_model=List[AttendanceByNetworkItem], dependencies=[Depends(require_collaborator)])
def read_attendance_by_network(
    period_start: date = Query(default=None),
    period_end: date = Query(default=None),
    db: Session = Depends(get_db_session),
):
    if period_start is None:
        period_start = date.today().replace(day=1)
    if period_end is None:
        period_end = date.today()
    return get_attendance_by_network(db, period_start, period_end)


@router.get("/by-cell", response_model=List[AttendanceByCellItem], dependencies=[Depends(require_collaborator)])
def read_attendance_by_cell(
    period_start: date = Query(default=None),
    period_end: date = Query(default=None),
    db: Session = Depends(get_db_session),
):
    if period_start is None:
        period_start = date.today().replace(day=1)
    if period_end is None:
        period_end = date.today()
    return get_attendance_by_cell(db, period_start, period_end)

