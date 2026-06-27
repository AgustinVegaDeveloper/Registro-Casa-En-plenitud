from dataclasses import dataclass
from datetime import date
from types import SimpleNamespace

import pytest

from app.core.security import get_password_hash
from app.services.dashboard_service import _build_entity_rows
from app.services.user_service import assign_cell_access, assign_network_advisor, assign_role, change_password, create_user, remove_role


@dataclass
class FakeQuery:
    result = None
    filter_args = []

    def __init__(self, result=None):
        self.result = result
        self.filter_args = []

    def filter(self, *args, **kwargs):
        self.filter_args.append(args)
        return self

    def first(self):
        return self.result

    def scalar(self):
        return self.result

    def count(self):
        return self.result if isinstance(self.result, int) else 0

    def all(self):
        return self.result if isinstance(self.result, list) else ([] if self.result is None else [self.result])

    def join(self, *args, **kwargs):
        return self

    def group_by(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self


@dataclass
class FakeSession:
    result = None
    added = []
    committed = False
    deleted = []

    def __init__(self, result=None):
        self.result = result
        self.added = []
        self.deleted = []
        self.committed = False

    def query(self, *args, **kwargs):
        return FakeQuery(self.result)

    def add(self, obj):
        self.added.append(obj)

    def delete(self, obj):
        self.deleted.append(obj)

    def flush(self):
        pass

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        pass


def make_role(code: str, id_: int = 1):
    return SimpleNamespace(code=code, id=id_)


def make_user(user_id: int = 1, username: str = "test", roles: list | None = None):
    user = SimpleNamespace(id=user_id, username=username, email="test@test.com", is_active=True, hashed_password="hashed_old", created_at=date(2026, 1, 1), roles=roles or [])
    return user


def make_month_row(month: int, presents=5, lates=2, excused=1, absents=1):
    return SimpleNamespace(month=month, total_records=presents + lates + excused + absents, presents=presents, lates=lates, excused=excused, absents=absents)


# ─── User Service Tests ───


def test_create_user_hashes_password() -> None:
    session = FakeSession()
    payload = SimpleNamespace(username="newuser", email="new@test.com", password="secret123", is_active=True)
    user = create_user(session, payload)
    assert user.username == "newuser"
    assert user.email == "new@test.com"
    assert user.is_active is True
    assert user.hashed_password != "secret123"
    assert session.committed


def test_assign_role_raises_error_for_invalid_role() -> None:
    user = make_user()
    session = FakeSession(result=None)
    with pytest.raises(ValueError, match="Role 'nonexistent' not found"):
        assign_role(session, user, "nonexistent")


def test_assign_role_creates_user_role_when_not_exists() -> None:
    role = make_role("advisor", id_=2)
    results = iter([role, None])
    session = FakeSession()
    session.query = lambda *a, **kw: FakeQuery(next(results))
    user = SimpleNamespace(id=1, roles=[], username="test", email="test@test.com", is_active=True, hashed_password="x", created_at=date(2026, 1, 1))
    assign_role(session, user, "advisor")
    assert len(session.added) == 1
    assert session.added[0].role_id == 2


def test_assign_role_skips_when_already_assigned() -> None:
    role = make_role("admin", id_=1)
    session = FakeSession(result=role)
    existing_user_role = SimpleNamespace(user_id=1, role_id=1)
    user = make_user(roles=[existing_user_role])
    user.roles = [SimpleNamespace(role=role)]
    role_codes = assign_role(session, user, "admin")
    assert "admin" in role_codes
    assert len(session.added) == 0


def test_remove_role_removes_existing_role() -> None:
    role = make_role("leader", id_=3)
    user_role = SimpleNamespace(user_id=1, role_id=3)
    user = make_user(roles=[user_role])
    user.roles = [SimpleNamespace(role=make_role("admin", id_=1))]
    session = FakeSession(result=role)
    role_codes = remove_role(session, user, "leader")
    assert "admin" in role_codes
    assert len(role_codes) == 1


def test_remove_role_raises_error_for_invalid_role() -> None:
    user = make_user()
    session = FakeSession(result=None)
    with pytest.raises(ValueError, match="Role 'ghost' not found"):
        remove_role(session, user, "ghost")


def test_change_password_raises_on_wrong_current_password() -> None:
    real_hash = get_password_hash("correct_password")
    user = SimpleNamespace(hashed_password=real_hash)
    session = FakeSession()
    with pytest.raises(ValueError, match="Current password is incorrect"):
        change_password(session, user, "wrong", "newpass123")


def test_assign_network_advisor_raises_when_full() -> None:
    results = iter([
        SimpleNamespace(id=10, name="Red Test"),
        None,
        2,
    ])
    session = FakeSession()
    session.query = lambda *a, **kw: FakeQuery(next(results))
    user = make_user()

    with pytest.raises(ValueError, match="Network already has 2 advisors"):
        assign_network_advisor(session, user, 10)


def test_assign_network_advisor_raises_when_already_assigned() -> None:
    session = FakeSession()
    session.query_count = 0
    original_query = session.query

    def query_with_count(*args, **kwargs):
        session.query_count += 1
        if session.query_count == 2:
            return FakeQuery(result=SimpleNamespace(id=1))
        return FakeQuery(result=SimpleNamespace(id=10, name="Red Test"))

    session.query = query_with_count
    session.query_count = 0
    user = make_user()

    with pytest.raises(ValueError, match="User is already an advisor for this network"):
        assign_network_advisor(session, user, 10)


def test_assign_cell_access_raises_when_already_exists() -> None:
    session = FakeSession()
    session.query_count = 0

    def query_with_count(*args, **kwargs):
        session.query_count += 1
        if session.query_count == 1:
            return FakeQuery(result=SimpleNamespace(id=5, code="1.1"))
        if session.query_count == 2:
            return FakeQuery(result=make_role("leader", id_=3))
        return FakeQuery(result=SimpleNamespace(id=1))

    session.query = query_with_count
    session.query_count = 0
    user = make_user()

    with pytest.raises(ValueError, match="User already has access to this cell"):
        assign_cell_access(session, user, 5, "leader")


# ─── Dashboard Chart Tests ───


def test_build_entity_rows_with_network_id() -> None:
    rows = [
        SimpleNamespace(network_id=1, network_name="Red A", total_records=10, presents=7, lates=1, excused=1, absents=1),
    ]
    result = _build_entity_rows(rows)
    assert len(result) == 1
    assert result[0]["network_id"] == 1
    assert result[0]["network_name"] == "Red A"
    assert result[0]["attendance_rate"] == 90.0


def test_build_entity_rows_with_cell_id() -> None:
    rows = [
        SimpleNamespace(cell_id=2, cell_code="1.2", cell_name="Cell B", total_records=0, presents=0, lates=0, excused=0, absents=0),
    ]
    result = _build_entity_rows(rows)
    assert len(result) == 1
    assert result[0]["cell_id"] == 2
    assert result[0]["cell_code"] == "1.2"
    assert result[0]["attendance_rate"] == 0.0


def test_build_entity_rows_handles_empty() -> None:
    result = _build_entity_rows([])
    assert result == []


def test_monthly_attendance_query_structure() -> None:
    rows = [make_month_row(1), make_month_row(3, presents=10, lates=0, excused=0, absents=0)]
    result = _build_entity_rows(rows)
    assert len(result) == 2
