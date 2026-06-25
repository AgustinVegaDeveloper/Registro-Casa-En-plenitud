"""hardening phase 1 foundations

Revision ID: 20260622_0002
Revises: 20260601_0001
Create Date: 2026-06-22 10:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260622_0002"
down_revision: Union[str, None] = "20260601_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    op.create_foreign_key(
        "fk_users_created_by_user_id",
        "users",
        "users",
        ["created_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_users_updated_by_user_id",
        "users",
        "users",
        ["updated_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    for table_name in [
        "roles",
        "networks",
        "members",
        "church_roles",
        "user_roles",
        "network_advisors",
        "cells",
        "cell_memberships",
        "meetings",
        "cell_member_roles",
        "attendance_records",
    ]:
        op.create_foreign_key(
            f"fk_{table_name}_created_by_user_id",
            table_name,
            "users",
            ["created_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_foreign_key(
            f"fk_{table_name}_updated_by_user_id",
            table_name,
            "users",
            ["updated_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )

    op.create_table(
        "user_cell_access",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("cell_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["cell_id"], ["cells.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "cell_id", "role_id", name="uq_user_cell_access"),
    )

    op.execute("UPDATE networks SET network_type = LOWER(network_type)")
    op.alter_column(
        "networks",
        "network_type",
        existing_type=sa.Enum("GROWTH", "CONSOLIDATION", "TRANSITION", name="networktype"),
        type_=sa.String(length=32),
        existing_nullable=False,
    )

    op.execute("UPDATE meetings SET meeting_type = LOWER(meeting_type)")
    op.alter_column(
        "meetings",
        "meeting_type",
        existing_type=sa.Enum("CELL_MEETING", "WEEKEND_SERVICE", name="meetingtype"),
        type_=sa.String(length=32),
        existing_nullable=False,
    )

    op.execute(
        """
        UPDATE attendance_records
        SET status = CASE status
            WHEN 'PRESENT' THEN 'P'
            WHEN 'LATE' THEN 'R'
            WHEN 'ABSENT' THEN 'N'
            WHEN 'EXCUSED' THEN 'E'
            ELSE status
        END
        """
    )
    op.execute(
        """
        UPDATE attendance_records
        SET excuse_reason = CASE excuse_reason
            WHEN 'ILLNESS' THEN 'illness'
            WHEN 'TRAVEL' THEN 'travel'
            WHEN 'WORK' THEN 'work'
            WHEN 'STUDY' THEN 'study'
            WHEN 'OTHER' THEN 'other'
            ELSE excuse_reason
        END
        WHERE excuse_reason IS NOT NULL
        """
    )
    op.alter_column(
        "attendance_records",
        "status",
        existing_type=sa.Enum("PRESENT", "LATE", "ABSENT", "EXCUSED", name="attendancestatus"),
        type_=sa.String(length=1),
        existing_nullable=False,
    )
    op.alter_column(
        "attendance_records",
        "excuse_reason",
        existing_type=sa.Enum("ILLNESS", "TRAVEL", "WORK", "STUDY", "OTHER", name="excusereason"),
        type_=sa.String(length=32),
        existing_nullable=True,
    )

    op.add_column("network_advisors", sa.Column("advisor_slot", sa.Integer(), nullable=True))
    op.execute(
        """
        UPDATE network_advisors na
        JOIN (
            SELECT
                id,
                ROW_NUMBER() OVER (PARTITION BY network_id ORDER BY id) AS advisor_slot
            FROM network_advisors
        ) ranked ON ranked.id = na.id
        SET na.advisor_slot = ranked.advisor_slot
        """
    )
    op.alter_column("network_advisors", "advisor_slot", existing_type=sa.Integer(), nullable=False)
    op.create_unique_constraint(
        "uq_network_advisor_slot",
        "network_advisors",
        ["network_id", "advisor_slot"],
    )
    op.create_check_constraint(
        "ck_network_advisor_slot_range",
        "network_advisors",
        "advisor_slot IN (1, 2)",
    )

    op.add_column(
        "cell_memberships",
        sa.Column(
            "active_membership_guard",
            sa.Integer(),
            sa.Computed("CASE WHEN end_date IS NULL THEN 1 ELSE NULL END"),
            nullable=True,
        ),
    )
    op.create_unique_constraint(
        "uq_member_active_membership",
        "cell_memberships",
        ["member_id", "active_membership_guard"],
    )
    op.create_check_constraint(
        "ck_membership_dates",
        "cell_memberships",
        "end_date IS NULL OR end_date >= start_date",
    )
    op.create_check_constraint(
        "ck_cell_member_role_dates",
        "cell_member_roles",
        "end_date IS NULL OR end_date >= start_date",
    )

    op.add_column("attendance_records", sa.Column("membership_id", sa.Integer(), nullable=True))
    op.create_index(
        "ix_attendance_records_membership_id",
        "attendance_records",
        ["membership_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_attendance_records_membership_id",
        "attendance_records",
        "cell_memberships",
        ["membership_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.execute(
        """
        UPDATE attendance_records ar
        JOIN meetings mt ON mt.id = ar.meeting_id
        JOIN cell_memberships cm
            ON cm.member_id = ar.member_id
            AND cm.cell_id = mt.cell_id
            AND cm.start_date <= mt.meeting_date
            AND (cm.end_date IS NULL OR cm.end_date >= mt.meeting_date)
        SET ar.membership_id = cm.id
        WHERE ar.membership_id IS NULL
        """
    )

    unmapped_records = connection.execute(
        sa.text("SELECT COUNT(*) FROM attendance_records WHERE membership_id IS NULL")
    ).scalar_one()
    if unmapped_records:
        raise RuntimeError(
            "Cannot migrate attendance_records without a matching active membership for each record."
        )

    op.alter_column("attendance_records", "membership_id", existing_type=sa.Integer(), nullable=False)
    op.drop_constraint("uq_attendance_member_meeting", "attendance_records", type_="unique")
    op.create_unique_constraint(
        "uq_attendance_membership_meeting",
        "attendance_records",
        ["meeting_id", "membership_id"],
    )
    op.create_check_constraint(
        "ck_attendance_excuse_required",
        "attendance_records",
        "("
        "status <> 'E' AND excuse_reason IS NULL AND excuse_text IS NULL"
        ") OR ("
        "status = 'E' AND (excuse_reason IS NOT NULL OR excuse_text IS NOT NULL)"
        ")",
    )


def downgrade() -> None:
    op.drop_constraint("ck_attendance_excuse_required", "attendance_records", type_="check")
    op.drop_constraint("uq_attendance_membership_meeting", "attendance_records", type_="unique")
    op.create_unique_constraint(
        "uq_attendance_member_meeting",
        "attendance_records",
        ["meeting_id", "member_id"],
    )
    op.drop_constraint("fk_attendance_records_membership_id", "attendance_records", type_="foreignkey")
    op.drop_index("ix_attendance_records_membership_id", table_name="attendance_records")
    op.drop_column("attendance_records", "membership_id")
    op.alter_column(
        "attendance_records",
        "excuse_reason",
        existing_type=sa.String(length=32),
        type_=sa.Enum("ILLNESS", "TRAVEL", "WORK", "STUDY", "OTHER", name="excusereason"),
        existing_nullable=True,
    )
    op.alter_column(
        "attendance_records",
        "status",
        existing_type=sa.String(length=1),
        type_=sa.Enum("PRESENT", "LATE", "ABSENT", "EXCUSED", name="attendancestatus"),
        existing_nullable=False,
    )

    op.drop_constraint("ck_cell_member_role_dates", "cell_member_roles", type_="check")
    op.drop_constraint("ck_membership_dates", "cell_memberships", type_="check")
    op.drop_constraint("uq_member_active_membership", "cell_memberships", type_="unique")
    op.drop_column("cell_memberships", "active_membership_guard")

    op.drop_constraint("ck_network_advisor_slot_range", "network_advisors", type_="check")
    op.drop_constraint("uq_network_advisor_slot", "network_advisors", type_="unique")
    op.drop_column("network_advisors", "advisor_slot")

    op.alter_column(
        "meetings",
        "meeting_type",
        existing_type=sa.String(length=32),
        type_=sa.Enum("CELL_MEETING", "WEEKEND_SERVICE", name="meetingtype"),
        existing_nullable=False,
    )
    op.alter_column(
        "networks",
        "network_type",
        existing_type=sa.String(length=32),
        type_=sa.Enum("GROWTH", "CONSOLIDATION", "TRANSITION", name="networktype"),
        existing_nullable=False,
    )

    for table_name in [
        "attendance_records",
        "cell_member_roles",
        "meetings",
        "cell_memberships",
        "cells",
        "network_advisors",
        "user_roles",
        "church_roles",
        "members",
        "networks",
        "roles",
    ]:
        op.drop_constraint(f"fk_{table_name}_updated_by_user_id", table_name, type_="foreignkey")
        op.drop_constraint(f"fk_{table_name}_created_by_user_id", table_name, type_="foreignkey")

    op.drop_constraint("fk_users_updated_by_user_id", "users", type_="foreignkey")
    op.drop_constraint("fk_users_created_by_user_id", "users", type_="foreignkey")
    op.drop_table("user_cell_access")
