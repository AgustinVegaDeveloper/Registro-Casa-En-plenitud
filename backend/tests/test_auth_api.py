from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint_returns_ok() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_endpoint_returns_token(monkeypatch) -> None:
    fake_user = SimpleNamespace(id=7, username="admin", email="admin@example.com", is_active=True, roles=[])

    def fake_authenticate_user(db, username, password):
        return fake_user

    monkeypatch.setattr("app.api.v1.endpoints.auth.authenticate_user", fake_authenticate_user)
    monkeypatch.setattr("app.api.v1.endpoints.auth.get_user_role_codes", lambda user: ["admin"])

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "Admin1234!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]
