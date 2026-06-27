from datetime import date

from pydantic import BaseModel, Field


class CellRoleAssignmentCreate(BaseModel):
    membership_id: int = Field(ge=1)
    role_code: str = Field(min_length=2, max_length=50)
    start_date: date


class CellRoleAssignmentRead(BaseModel):
    id: int
    membership_id: int
    role_id: int
    role_code: str
    role_name: str
    start_date: date
    end_date: date | None

