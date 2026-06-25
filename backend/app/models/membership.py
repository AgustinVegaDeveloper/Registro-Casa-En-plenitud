from datetime import date

from sqlalchemy import CheckConstraint, Computed, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class ChurchRole(Base, AuditMixin):
    __tablename__ = "church_roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)

    assignments = relationship(
        "CellMemberRole",
        back_populates="role",
        cascade="all, delete-orphan",
        foreign_keys="CellMemberRole.role_id",
    )


class CellMembership(Base, AuditMixin):
    __tablename__ = "cell_memberships"
    __table_args__ = (
        UniqueConstraint("member_id", "active_membership_guard", name="uq_member_active_membership"),
        CheckConstraint("end_date IS NULL OR end_date >= start_date", name="ck_membership_dates"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    cell_id: Mapped[int] = mapped_column(ForeignKey("cells.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    active_membership_guard: Mapped[int | None] = mapped_column(
        Integer,
        Computed("CASE WHEN end_date IS NULL THEN 1 ELSE NULL END"),
        nullable=True,
    )

    member = relationship("Member", back_populates="memberships", foreign_keys=[member_id])
    cell = relationship("Cell", back_populates="memberships", foreign_keys=[cell_id])
    roles = relationship(
        "CellMemberRole",
        back_populates="membership",
        cascade="all, delete-orphan",
        foreign_keys="CellMemberRole.membership_id",
    )
    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="membership",
        cascade="all, delete-orphan",
        foreign_keys="AttendanceRecord.membership_id",
    )


class CellMemberRole(Base, AuditMixin):
    __tablename__ = "cell_member_roles"
    __table_args__ = (
        UniqueConstraint("membership_id", "role_id", "start_date", name="uq_membership_role_start"),
        CheckConstraint("end_date IS NULL OR end_date >= start_date", name="ck_cell_member_role_dates"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    membership_id: Mapped[int] = mapped_column(
        ForeignKey("cell_memberships.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_id: Mapped[int] = mapped_column(ForeignKey("church_roles.id", ondelete="CASCADE"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    membership = relationship("CellMembership", back_populates="roles", foreign_keys=[membership_id])
    role = relationship("ChurchRole", back_populates="assignments", foreign_keys=[role_id])
