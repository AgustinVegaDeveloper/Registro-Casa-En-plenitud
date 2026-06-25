from datetime import date

from sqlalchemy import Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class Member(Base, AuditMixin):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)
    document: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(String(180), nullable=True)
    neighborhood: Mapped[str | None] = mapped_column(String(80), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    church_join_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    first_cell_join_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    memberships = relationship(
        "CellMembership",
        back_populates="member",
        cascade="all, delete-orphan",
        foreign_keys="CellMembership.member_id",
    )
    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="member",
        cascade="all, delete-orphan",
        foreign_keys="AttendanceRecord.member_id",
    )
