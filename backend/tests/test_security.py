from datetime import timedelta

from app.core.security import create_access_token, decode_token, get_password_hash, verify_password


def test_password_hash_roundtrip() -> None:
    hashed = get_password_hash("StrongPass123!")

    assert hashed != "StrongPass123!"
    assert verify_password("StrongPass123!", hashed)


def test_access_token_contains_subject_and_roles() -> None:
    token = create_access_token("42", expires_delta=timedelta(minutes=5), extra_claims={"roles": ["admin"]})
    payload = decode_token(token)

    assert payload["sub"] == "42"
    assert payload["roles"] == ["admin"]
    assert "exp" in payload
