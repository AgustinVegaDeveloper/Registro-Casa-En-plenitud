from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class MemberBase(BaseModel):
    document: str = Field(min_length=4, max_length=30)
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    birth_date: date | None = None
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=180)
    neighborhood: str | None = Field(default=None, max_length=80)
    notes: str | None = None
    photo_path: str | None = Field(default=None, max_length=255)
    church_join_date: date | None = None
    first_cell_join_date: date | None = None


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=2, max_length=80)
    last_name: str | None = Field(default=None, min_length=2, max_length=80)
    birth_date: date | None = None
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=180)
    neighborhood: str | None = Field(default=None, max_length=80)
    notes: str | None = None
    photo_path: str | None = Field(default=None, max_length=255)
    church_join_date: date | None = None
    first_cell_join_date: date | None = None


class MemberRead(MemberBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

