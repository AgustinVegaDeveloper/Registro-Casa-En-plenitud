from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserLogin(BaseModel):
    username: str
    password: str


class CurrentUserResponse(BaseModel):
    id: int
    username: str
    email: str | None
    is_active: bool
    roles: list[str]


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    email: str | None = Field(default=None, max_length=120)
    password: str = Field(min_length=6, max_length=120)
    is_active: bool = True


class UserUpdate(BaseModel):
    email: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None
    is_active: bool
    created_at: datetime | None
    role_codes: list[str] = []


class UserRoleAssignment(BaseModel):
    role_code: str = Field(min_length=2, max_length=50)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=120)


class AdminPasswordSet(BaseModel):
    new_password: str = Field(min_length=6, max_length=120)


class NetworkAdvisorCreate(BaseModel):
    network_id: int


class NetworkAdvisorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    network_id: int
    network_name: str
    advisor_slot: int


class CellAccessCreate(BaseModel):
    cell_id: int
    role_code: str


class CellAccessRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cell_id: int
    cell_code: str
    role_code: str
    role_name: str
