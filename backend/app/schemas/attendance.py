from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AttendanceStatus, ExcuseReason, MeetingType


class MeetingBase(BaseModel):
    cell_id: int = Field(ge=1)
    meeting_type: MeetingType
    meeting_date: date
    notes: str | None = None


class MeetingCreate(MeetingBase):
    pass


class MeetingRead(MeetingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class AttendanceItem(BaseModel):
    membership_id: int = Field(ge=1)
    status: AttendanceStatus
    excuse_reason: ExcuseReason | None = None
    excuse_text: str | None = Field(default=None, max_length=255)


class AttendanceBatchCreate(BaseModel):
    meeting_id: int = Field(ge=1)
    items: list[AttendanceItem]


class AttendanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    member_id: int
    membership_id: int
    status: AttendanceStatus
    excuse_reason: ExcuseReason | None = None
    excuse_text: str | None = None


class AttendanceRosterItem(BaseModel):
    membership_id: int
    member_id: int
    document: str
    full_name: str
    status: AttendanceStatus | None = None
    excuse_reason: ExcuseReason | None = None
    excuse_text: str | None = None
