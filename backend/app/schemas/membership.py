from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class CellMembershipBase(BaseModel):
    member_id: int = Field(ge=1)
    cell_id: int = Field(ge=1)
    start_date: date
    end_date: date | None = None


class CellMembershipCreate(CellMembershipBase):
    pass


class CellMembershipTransfer(BaseModel):
    target_cell_id: int = Field(ge=1)
    transfer_date: date


class CellMembershipClose(BaseModel):
    end_date: date


class CellMembershipRead(CellMembershipBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
