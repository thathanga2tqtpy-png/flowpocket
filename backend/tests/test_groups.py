import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client_a():
    client = TestClient(app)
    unique_email = f"user_a_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Password123!", "display_name": "Lan (Owner)"},
    )
    return client


@pytest.fixture
def client_b():
    client = TestClient(app)
    unique_email = f"user_b_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Password123!", "display_name": "Minh (Member)"},
    )
    return client


@pytest.fixture
def client_c():
    client = TestClient(app)
    unique_email = f"user_c_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Password123!", "display_name": "Huy (External)"},
    )
    return client


def test_create_group(client_a):
    res = client_a.post(
        "/api/v1/groups",
        json={"name": "Nhóm Chuyến Đi Đà Lạt", "description": "Chi tiêu cho chuyến đi du lịch"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Nhóm Chuyến Đi Đà Lạt"
    assert data["current_user_role"] == "OWNER"
    assert data["member_count"] == 1
    assert len(data["members"]) == 1
    assert data["members"][0]["role"] == "OWNER"


def test_non_member_cannot_access_group(client_a, client_b):
    group = client_a.post(
        "/api/v1/groups",
        json={"name": "Nhóm Riêng Tư"},
    ).json()

    # Client B is not in group
    res = client_b.get(f"/api/v1/groups/{group['id']}")
    assert res.status_code in (403, 404)


def test_invite_and_join_group(client_a, client_b):
    group = client_a.post(
        "/api/v1/groups",
        json={"name": "Nhóm Bạn Bè"},
    ).json()

    # Owner generates invitation
    invite_res = client_a.post(
        f"/api/v1/groups/{group['id']}/invitations",
        json={"expires_in_days": 5},
    )
    assert invite_res.status_code == 201
    invite_data = invite_res.json()
    raw_token = invite_data["raw_token"]
    assert raw_token

    # Client B joins via raw_token
    join_res = client_b.post(
        "/api/v1/groups/join",
        json={"token": raw_token},
    )
    assert join_res.status_code == 200
    group_detail = join_res.json()
    assert group_detail["member_count"] == 2
    assert any(m["display_name"] == "Minh (Member)" and m["role"] == "MEMBER" for m in group_detail["members"])


def test_invite_single_use(client_a, client_b, client_c):
    group = client_a.post(
        "/api/v1/groups",
        json={"name": "Nhóm Single Use"},
    ).json()

    invite_res = client_a.post(
        f"/api/v1/groups/{group['id']}/invitations",
        json={},
    )
    raw_token = invite_res.json()["raw_token"]

    # Client B joins first
    join1 = client_b.post("/api/v1/groups/join", json={"token": raw_token})
    assert join1.status_code == 200

    # Client C attempts to reuse the same token
    join2 = client_c.post("/api/v1/groups/join", json={"token": raw_token})
    assert join2.status_code == 400
    assert "chỉ dùng 1 lần" in join2.json()["detail"]


def test_invite_invalid_token_fails(client_b):
    res = client_b.post(
        "/api/v1/groups/join",
        json={"token": "invalid_random_token_nonexistent_12345"},
    )
    assert res.status_code == 404


def test_member_cannot_generate_invite_or_promote(client_a, client_b):
    group = client_a.post(
        "/api/v1/groups",
        json={"name": "Nhóm Phân Quyền"},
    ).json()

    # Invite Client B
    invite = client_a.post(f"/api/v1/groups/{group['id']}/invitations", json={}).json()
    client_b.post("/api/v1/groups/join", json={"token": invite["raw_token"]})

    # Client B (MEMBER) attempts to generate invitation -> 403 Forbidden
    member_invite = client_b.post(f"/api/v1/groups/{group['id']}/invitations", json={})
    assert member_invite.status_code == 403

    # Client B attempts to promote himself to OWNER -> 403 Forbidden
    detail = client_a.get(f"/api/v1/groups/{group['id']}").json()
    member_b = next(m for m in detail["members"] if m["display_name"] == "Minh (Member)")

    promote_res = client_b.patch(
        f"/api/v1/groups/{group['id']}/members/{member_b['user_id']}",
        json={"role": "OWNER"},
    )
    assert promote_res.status_code == 403


def test_owner_transfer_and_leave_policy(client_a, client_b):
    group = client_a.post(
        "/api/v1/groups",
        json={"name": "Nhóm Chuyển Quyền"},
    ).json()

    invite = client_a.post(f"/api/v1/groups/{group['id']}/invitations", json={}).json()
    client_b.post("/api/v1/groups/join", json={"token": invite["raw_token"]})

    # Owner attempts to leave group while Member B is present -> fails 400
    leave_fail = client_a.post(f"/api/v1/groups/{group['id']}/leave")
    assert leave_fail.status_code == 400
    assert "chuyển quyền Owner trước" in leave_fail.json()["detail"]

    # Owner transfers ownership to Member B
    detail = client_a.get(f"/api/v1/groups/{group['id']}").json()
    member_b = next(m for m in detail["members"] if m["display_name"] == "Minh (Member)")

    transfer_role = client_a.patch(
        f"/api/v1/groups/{group['id']}/members/{member_b['user_id']}",
        json={"role": "OWNER"},
    )
    assert transfer_role.status_code == 200
    assert transfer_role.json()["role"] == "OWNER"

    # Now Client A (who was demoted to ADMIN) can leave group
    leave_success = client_a.post(f"/api/v1/groups/{group['id']}/leave")
    assert leave_success.status_code == 204

    # Group detail now shows only Client B as OWNER
    detail2 = client_b.get(f"/api/v1/groups/{group['id']}").json()
    assert detail2["member_count"] == 1
    assert detail2["members"][0]["display_name"] == "Minh (Member)"


def test_personal_finance_isolation_remains_intact(client_a, client_b):
    # User A creates a personal wallet
    wallet_a = client_a.post(
        "/api/v1/wallets",
        json={"name": "Ví Cá Nhân Của Lan", "opening_balance": 1000000},
    ).json()

    # Join same group
    group = client_a.post("/api/v1/groups", json={"name": "Nhóm Chung"}).json()
    invite = client_a.post(f"/api/v1/groups/{group['id']}/invitations", json={}).json()
    client_b.post("/api/v1/groups/join", json={"token": invite["raw_token"]})

    # User B CANNOT see or access User A's personal wallet
    res = client_b.get(f"/api/v1/wallets/{wallet_a['id']}")
    assert res.status_code == 404

