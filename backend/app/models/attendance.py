from datetime import date

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base
from app.models.enums import AttendanceStatus, ExcuseReason, MeetingType


class Meeting(Base, AuditMixin):
    __tablename__ = "meetings"
    __table_args__ = (UniqueConstraint("cell_id", "meeting_type", "meeting_date", name="uq_meeting_per_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    cell_id: Mapped[int] = mapped_column(ForeignKey("cells.id", ondelete="CASCADE"), nullable=False, index=True)
    meeting_type: Mapped[MeetingType] = mapped_column(
        Enum(
            MeetingType,
            values_callable=lambda enum_class: [item.value for item in enum_class],
            native_enum=False,
            validate_strings=True,
        ),
        nullable=False,
    )
    meeting_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    cell = relationship("Cell", back_populates="meetings", foreign_keys=[cell_id])
    records = relationship(
        "AttendanceRecord",
        back_populates="meeting",
        cascade="all, delete-orphan",
        foreign_keys="AttendanceRecord.meeting_id",
    )


class AttendanceRecord(Base, AuditMixin):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("meeting_id", "membership_id", name="uq_attendance_membership_meeting"),
        CheckConstraint(
            "("
            "status <> 'E' AND excuse_reason IS NULL AND excuse_text IS NULL"
            ") OR ("
            "status = 'E' AND (excuse_reason IS NOT NULL OR excuse_text IS NOT NULL)"
            ")",
            name="ck_attendance_excuse_required",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    membership_id: Mapped[int] = mapped_column(
        ForeignKey("cell_memberships.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(
            AttendanceStatus,
            values_callable=lambda enum_class: [item.value for item in enum_class],
            native_enum=False,
            validate_strings=True,
        ),
        nullable=False,
        index=True,
    )
    excuse_reason: Mapped[ExcuseReason | None] = mapped_column(
        Enum(
            ExcuseReason,
            values_callable=lambda enum_class: [item.value for item in enum_class],
            native_enum=False,
            validate_strings=True,
        ),
        nullable=True,
    )
    excuse_text: Mapped[str | None] = mapped_column(String(255), nullable=True)

    meeting = relationship("Meeting", back_populates="records", foreign_keys=[meeting_id])
    member = relationship("Member", back_populates="attendance_records", foreign_keys=[member_id])
    membership = relationship("CellMembership", back_populates="attendance_records", foreign_keys=[membership_id])
