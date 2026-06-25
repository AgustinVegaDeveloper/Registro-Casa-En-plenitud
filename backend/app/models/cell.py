from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class Cell(Base, AuditMixin):
    __tablename__ = "cells"
    __table_args__ = (
        UniqueConstraint("network_id", "cell_number", name="uq_network_cell_number"),
        UniqueConstraint("code", name="uq_cell_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    network_id: Mapped[int] = mapped_column(ForeignKey("networks.id", ondelete="CASCADE"), nullable=False, index=True)
    cell_number: Mapped[int] = mapped_column(Integer, nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    network = relationship("Network", back_populates="cells", foreign_keys=[network_id])
    memberships = relationship(
        "CellMembership",
        back_populates="cell",
        cascade="all, delete-orphan",
        foreign_keys="CellMembership.cell_id",
    )
    meetings = relationship(
        "Meeting",
        back_populates="cell",
        cascade="all, delete-orphan",
        foreign_keys="Meeting.cell_id",
    )
    user_accesses = relationship(
        "UserCellAccess",
        back_populates="cell",
        cascade="all, delete-orphan",
        foreign_keys="UserCellAccess.cell_id",
    )
