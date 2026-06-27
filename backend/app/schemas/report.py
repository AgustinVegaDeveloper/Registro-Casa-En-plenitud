from datetime import date

from pydantic import BaseModel, ConfigDict


class ReportSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    period_start: date
    period_end: date
    total_meetings: int
    total_records: int
    presents: int
    lates: int
    excused: int
    absents: int
    attendance_rate: float


class ReportScopeItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    entity_id: int
    entity_name: str
    total_meetings: int
    total_records: int
    presents: int
    lates: int
    excused: int
    absents: int
    attendance_rate: float
