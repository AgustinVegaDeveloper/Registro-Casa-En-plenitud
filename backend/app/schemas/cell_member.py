from pydantic import BaseModel, ConfigDict


class CellMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    member_id: int
    membership_id: int
    document: str
    first_name: str
    last_name: str
    phone: str | None
    neighborhood: str | None
    is_active_membership: bool

