from sqlalchemy import CheckConstraint, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base
from app.models.enums import NetworkType


class Network(Base, AuditMixin):
    __tablename__ = "networks"

    id: Mapped[int] = mapped_column(primary_key=True)
    network_number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    network_type: Mapped[NetworkType] = mapped_column(
        Enum(
            NetworkType,
            values_callable=lambda enum_class: [item.value for item in enum_class],
            native_enum=False,
            validate_strings=True,
        ),
        nullable=False,
    )

    cells = relationship(
        "Cell",
        back_populates="network",
        cascade="all, delete-orphan",
        foreign_keys="Cell.network_id",
    )
    advisors = relationship(
        "NetworkAdvisor",
        back_populates="network",
        cascade="all, delete-orphan",
        foreign_keys="NetworkAdvisor.network_id",
    )


class NetworkAdvisor(Base, AuditMixin):
    __tablename__ = "network_advisors"
    __table_args__ = (
        UniqueConstraint("network_id", "user_id", name="uq_network_advisor"),
        UniqueConstraint("network_id", "advisor_slot", name="uq_network_advisor_slot"),
        CheckConstraint("advisor_slot IN (1, 2)", name="ck_network_advisor_slot_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    network_id: Mapped[int] = mapped_column(ForeignKey("networks.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    advisor_slot: Mapped[int] = mapped_column(Integer, nullable=False)

    network = relationship("Network", back_populates="advisors", foreign_keys=[network_id])
    user = relationship("User", back_populates="advisor_networks", foreign_keys=[user_id])
