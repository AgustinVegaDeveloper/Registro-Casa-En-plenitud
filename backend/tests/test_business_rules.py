from dataclasses import dataclass
from datetime import date
from types import SimpleNamespace

import pytest

from app.models.attendance import AttendanceRecord, Meeting
from app.models.cell import Cell
from app.models.membership import CellMembership
from app.services.attendance_service import validate_membership_belongs_to_meeting_cell
from app.services.attendance_crud_service import create_or_update_attendance_batch, normalize_excuse_fields
from app.services.authorization_service import can_access_cell, can_access_network, user_is_admin
from app.services.cell_summary_service import get_cell_summary
from app.services.cell_crud_service import assign_cell_role
from app.services.membership_crud_service import transfer_member_to_cell, validate_membership_dates
from app.services.membership_service import validate_membership_is_active


@dataclass
class FakeUserRole:
    code: str


@dataclass
class FakeAdvisorNetwork:
    network_id: int


@dataclass
class FakeCellAccess:
    user_id: int
    cell_id: int


class FakeQuery:
    def __init__(self, result):
        self.result = result

    def join(self, *args, **kwargs):
        return self

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.result

    def scalar(self):
        return self.result

    def one(self):
        return self.result


class FakeSession:
    def __init__(self, result=None):
        self.result = result

    def query(self, *args, **kwargs):
        return FakeQuery(self.result)

    def add(self, *args, **kwargs):
        return None

    def commit(self):
        return None

    def refresh(self, *args, **kwargs):
        return None


class FakeSummarySession:
    def __init__(self, cell_result=None, total_members=0, latest_meeting_date=None, attendance_row=None):
        self.cell_result = cell_result
        self.total_members = total_members
        self.latest_meeting_date = latest_meeting_date
        self.attendance_row = attendance_row or SimpleNamespace(
            total_attendance_records=0,
            presents=0,
            lates=0,
            excused=0,
            absents=0,
        )
        self.query_calls = 0

    def query(self, *args, **kwargs):
        self.query_calls += 1
        if self.query_calls == 1:
            return FakeSummaryQuery(result=self.cell_result)
        if self.query_calls == 2:
            return FakeSummaryQuery(result=self.total_members)
        if self.query_calls == 3:
            return FakeSummaryQuery(result=self.latest_meeting_date)
        return FakeSummaryQuery(result=self.attendance_row)


class FakeSummaryQuery:
    def __init__(self, result):
        self.result = result

    def filter(self, *args, **kwargs):
        return self

    def join(self, *args, **kwargs):
        return self

    def scalar(self):
        return self.result

    def one(self):
        return self.result

    def first(self):
        return self.result


class FakeAttendanceQuery:
    def __init__(self, result):
        self.result = result

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.result

    def all(self):
        return self.result


class FakeAttendanceSession:
    def __init__(self, meeting=None, membership=None, records=None):
        self.meeting = meeting
        self.membership = membership
        self.records = records or []
        self.added = []

    def query(self, model):
        if model is Meeting:
            return FakeAttendanceQuery(self.meeting)
        if model is CellMembership:
            return FakeAttendanceQuery(self.membership)
        if model is AttendanceRecord:
            return FakeAttendanceQuery(self.records)
        return FakeAttendanceQuery(None)

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        return None

    def refresh(self, *args, **kwargs):
        return None


class FakeAssignQuery:
    def __init__(self, result):
        self.result = result

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.result


class FakeAssignSession:
    def __init__(self, membership=None, role=None, existing=None):
        self.membership = membership
        self.role = role
        self.existing = existing

    def query(self, model):
        if model is CellMembership:
            return FakeAssignQuery(self.membership)
        from app.models.membership import ChurchRole, CellMemberRole

        if model is ChurchRole:
            return FakeAssignQuery(self.role)
        if model is CellMemberRole:
            return FakeAssignQuery(self.existing)
        return FakeAssignQuery(None)

    def add(self, *args, **kwargs):
        return None

    def commit(self):
        return None

    def refresh(self, *args, **kwargs):
        return None


def make_user(user_id: int, roles: list[str], advisor_networks=None):
    return SimpleNamespace(
        id=user_id,
        roles=[SimpleNamespace(role=FakeUserRole(code=role)) for role in roles],
        advisor_networks=advisor_networks or [],
    )


def test_user_is_admin_detects_admin_role() -> None:
    user = make_user(1, ["admin"])

    assert user_is_admin(user)


def test_user_is_admin_returns_false_for_non_admin() -> None:
    user = make_user(1, ["leader"])

    assert not user_is_admin(user)


def test_can_access_network_for_advisor_by_network_id() -> None:
    user = make_user(2, ["advisor"], advisor_networks=[FakeAdvisorNetwork(network_id=10)])

    assert can_access_network(FakeSession(), user, 10)
    assert not can_access_network(FakeSession(), user, 99)


def test_can_access_network_for_leader_via_cell_access() -> None:
    user = make_user(3, ["leader"])
    session = FakeSession(result=FakeCellAccess(user_id=3, cell_id=7))

    assert can_access_network(session, user, 5)


def test_can_access_cell_for_advisor_by_related_network() -> None:
    user = make_user(4, ["advisor"], advisor_networks=[FakeAdvisorNetwork(network_id=15)])
    session = FakeSession(result=SimpleNamespace(id=1, network_id=15))

    assert can_access_cell(session, user, 1)


def test_can_access_cell_for_collaborator_via_cell_access() -> None:
    user = make_user(5, ["collaborator"])
    session = FakeSession(result=FakeCellAccess(user_id=5, cell_id=12))

    assert can_access_cell(session, user, 12)


def test_validate_membership_belongs_to_meeting_cell() -> None:
    meeting = Meeting()
    meeting.cell_id = 21
    membership = CellMembership()
    membership.cell_id = 21
    other_membership = CellMembership()
    other_membership.cell_id = 99

    assert validate_membership_belongs_to_meeting_cell(meeting, membership)
    assert not validate_membership_belongs_to_meeting_cell(meeting, other_membership)


def test_validate_membership_is_active() -> None:
    active_membership = CellMembership()
    active_membership.end_date = None
    inactive_membership = CellMembership()
    inactive_membership.end_date = date(2026, 6, 1)

    assert validate_membership_is_active(active_membership)
    assert not validate_membership_is_active(inactive_membership)


def test_attendance_record_model_relationship_fields_exist() -> None:
    record = AttendanceRecord()
    record.meeting_id = 1
    record.member_id = 2
    record.membership_id = 3

    assert record.meeting_id == 1
    assert record.member_id == 2
    assert record.membership_id == 3


def test_validate_membership_dates_rejects_reverse_range() -> None:
    with pytest.raises(ValueError):
        validate_membership_dates(date(2026, 6, 2), date(2026, 6, 1))


def test_transfer_member_to_cell_rejects_same_cell() -> None:
    current_membership = CellMembership()
    current_membership.cell_id = 10
    current_membership.member_id = 1
    current_membership.start_date = date(2026, 6, 1)
    current_membership.end_date = None

    with pytest.raises(ValueError):
        transfer_member_to_cell(
            FakeSession(result=SimpleNamespace(id=10)),
            current_membership,
            SimpleNamespace(target_cell_id=10, transfer_date=date(2026, 6, 2)),
        )


def test_assign_cell_role_rejects_membership_from_other_cell() -> None:
    membership = CellMembership()
    membership.id = 44
    membership.cell_id = 10
    membership.end_date = None

    role = SimpleNamespace(id=7, code="main_leader", name="Lider Principal")

    with pytest.raises(ValueError, match="Membership does not belong to the cell"):
        assign_cell_role(
            FakeAssignSession(membership=membership, role=role, existing=None),
            99,
            SimpleNamespace(membership_id=44, role_code="main_leader", start_date=date(2026, 6, 2)),
        )


def test_get_cell_summary_returns_counts() -> None:
    cell = Cell()
    cell.id = 8
    cell.code = "1.1"
    cell.name = "Cell A"

    session = FakeSummarySession()
    session.cell_result = cell
    session.total_members = 12
    session.latest_meeting_date = date(2026, 6, 21)
    session.attendance_row = SimpleNamespace(
        total_attendance_records=20,
        presents=10,
        lates=3,
        excused=4,
        absents=3,
    )

    summary = get_cell_summary(session, 8)

    assert summary["cell_id"] == 8
    assert summary["cell_code"] == "1.1"
    assert summary["total_members"] == 12
    assert summary["presents"] == 10
    assert summary["lates"] == 3
    assert summary["excused"] == 4
    assert summary["absents"] == 3


def test_normalize_excuse_fields_requires_excuse_when_excused() -> None:
    with pytest.raises(ValueError):
        normalize_excuse_fields("E", None, None)


def test_create_or_update_attendance_batch_adds_records() -> None:
    meeting = Meeting()
    meeting.id = 1
    meeting.cell_id = 20
    meeting.meeting_date = date(2026, 6, 22)
    membership = CellMembership()
    membership.id = 5
    membership.member_id = 9
    membership.cell_id = 20
    membership.start_date = date(2026, 6, 1)
    membership.end_date = None

    session = FakeAttendanceSession(meeting=meeting, membership=membership, records=[])

    batch = create_or_update_attendance_batch(
        session,
        SimpleNamespace(
            meeting_id=1,
            items=[
                SimpleNamespace(
                    membership_id=5,
                    status=SimpleNamespace(value="P"),
                    excuse_reason=None,
                    excuse_text=None,
                )
            ],
        ),
    )

    assert len(batch) == 1
    assert session.added[0].membership_id == 5
    assert session.added[0].status.value == "P"
