import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.session import AuthSession
from app.core.config import settings


@pytest.fixture
def client():
    # Return fresh TestClient for each test so cookies are isolated
    return TestClient(app)


def test_register_user_success(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "password": "StrongPassword123!",
        "display_name": "Nguyễn Văn A",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "user" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["display_name"] == "Nguyễn Văn A"
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]

    # Verify session cookie was set
    assert settings.SESSION_COOKIE_NAME in response.cookies


def test_register_duplicate_email_fails(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "password": "StrongPassword123!",
        "display_name": "Nguyễn Văn B",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Try registering again with the same email
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "Email này đã được sử dụng" in res2.json()["detail"]


def test_password_hashed_with_argon2id(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    raw_password = "SecretPassword456!"
    payload = {
        "email": unique_email,
        "password": raw_password,
        "display_name": "Kiểm Tra Hash",
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201

    # Verify directly in database
    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.email == unique_email)
        ).scalar_one()
        assert user.password_hash.startswith("$argon2id$")
        assert raw_password not in user.password_hash
    finally:
        db.close()


def test_login_success(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "MySecurePassword789!"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password, "display_name": "User Login"},
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == unique_email
    assert settings.SESSION_COOKIE_NAME in response.cookies


def test_login_invalid_password_fails(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "CorrectPassword123!", "display_name": "Wrong Pass"},
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert "Email hoặc mật khẩu không chính xác" in response.json()["detail"]


def test_get_me_authenticated(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "TestPassword123!", "display_name": "User Me"},
    )
    # The client automatically retains the cookie from register
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == unique_email
    assert user_data["display_name"] == "User Me"


def test_get_me_unauthenticated_fails(client):
    # Brand new client without cookies
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_logout_revokes_session(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "LogoutPassword123!", "display_name": "User Logout"},
    )

    # Logout
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Attempting to access /me after logout must fail
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 401


def test_revoke_all_sessions(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "RevokeAllPassword123!", "display_name": "User Revoke"},
    )

    # Call revoke-all
    revoke_res = client.post("/api/v1/auth/revoke-all")
    assert revoke_res.status_code == 200
    assert "Đã thu hồi thành công" in revoke_res.json()["message"]

    # Verify session is revoked
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 401

