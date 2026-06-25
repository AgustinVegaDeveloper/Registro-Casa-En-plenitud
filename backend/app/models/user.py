from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class User(Base, AuditMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(120), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    roles = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="UserRole.user_id",
    )
    advisor_networks = relationship(
        "NetworkAdvisor",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="NetworkAdvisor.user_id",
    )
    cell_accesses = relationship(
        "UserCellAccess",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="UserCellAccess.user_id",
    )
