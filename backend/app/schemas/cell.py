from pydantic import BaseModel, ConfigDict, Field


class CellBase(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    is_active: bool = True


class CellCreate(CellBase):
    network_id: int = Field(ge=1)


class CellUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None


class CellRead(CellBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    network_id: int
    cell_number: int
    code: str

