from datetime import date

from pydantic import BaseModel, ConfigDict


class DashboardSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_networks: int
    total_cells: int
    total_members: int
    monthly_attendance: int
    last_weekend_date: date | None = None
    last_weekend_presents: int = 0
    last_weekend_lates: int = 0
    last_weekend_total: int = 0


class MonthlyAttendanceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    year: int
    month: int
    total_records: int
    presents: int
    lates: int
    excused: int
    absents: int


class AttendanceByNetworkItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    network_id: int
    network_name: str
    total_records: int
    presents: int
    lates: int
    excused: int
    absents: int
    attendance_rate: float


class AttendanceByCellItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cell_id: int
    cell_code: str
    cell_name: str
    total_records: int
    presents: int
    lates: int
    excused: int
    absents: int
    attendance_rate: float

