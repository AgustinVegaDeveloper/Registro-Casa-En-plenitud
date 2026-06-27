from datetime import date

from pydantic import BaseModel, ConfigDict


class CellRoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    membership_id: int
    member_id: int
    member_name: str
    role_code: str
    role_name: str
    start_date: date
    end_date: date | None

