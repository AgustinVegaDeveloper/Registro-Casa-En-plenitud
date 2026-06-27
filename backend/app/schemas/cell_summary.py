from pydantic import BaseModel, ConfigDict


class CellSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cell_id: int
    cell_code: str
    cell_name: str | None
    total_members: int
    presents: int
    lates: int
    excused: int
    absents: int
    total_attendance_records: int
    latest_meeting_date: str | None

