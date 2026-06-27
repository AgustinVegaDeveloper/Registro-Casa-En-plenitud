from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import NetworkType


class NetworkBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    network_type: NetworkType


class NetworkCreate(NetworkBase):
    network_number: int = Field(ge=1)


class NetworkUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    network_type: NetworkType | None = None


class NetworkRead(NetworkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    network_number: int

