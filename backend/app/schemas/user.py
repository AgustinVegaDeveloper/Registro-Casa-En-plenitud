from pydantic import BaseModel


class UserLogin(BaseModel):
    username: str
    password: str


class CurrentUserResponse(BaseModel):
    id: int
    username: str
    email: str | None
    is_active: bool
    roles: list[str]
