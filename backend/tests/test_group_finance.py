import uuid
import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def create_user_and_login(client: TestClient, email: str, name: str, password: str = "Password123!"):
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": name},
    )
    assert resp.status_code == 201
    return resp.json()["user"]


def test_expense_equal_split_and_remainder_conservation(client: TestClient):
    """
    Test EQUAL split with remainder:
    Total: 100,000 VND split equally among 3 members:
    33,334 + 33,333 + 33,333 = 100,000 VND.
    Total is preserved without losing or creating a single VND.
    """
    uid = uuid.uuid4().hex[:6]
    user_a = create_user_and_login(client, f"alice_{uid}@example.com", "Alice F5")
    user_b = create_user_and_login(client, f"bob_{uid}@example.com", "Bob F5")
    user_c = create_user_and_login(client, f"charlie_{uid}@example.com", "Charlie F5")

    # Login as Alice to create group
    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})
    g_res = client.post("/api/v1/groups", json={"name": "Nhóm Đi Chơi F5"})
    assert g_res.status_code == 201
    group_id = g_res.json()["id"]

    # Alice invites Bob & Charlie
    inv_res = client.post(f"/api/v1/groups/{group_id}/invitations", json={})
    token_b = inv_res.json()["raw_token"]

    inv_res2 = client.post(f"/api/v1/groups/{group_id}/invitations", json={})
    token_c = inv_res2.json()["raw_token"]

    # Bob joins
    client.post("/api/v1/auth/login", json={"email": f"bob_{uid}@example.com", "password": "Password123!"})
    join_b = client.post("/api/v1/groups/join", json={"token": token_b})
    assert join_b.status_code == 200

    # Charlie joins
    client.post("/api/v1/auth/login", json={"email": f"charlie_{uid}@example.com", "password": "Password123!"})
    join_c = client.post("/api/v1/groups/join", json={"token": token_c})
    assert join_c.status_code == 200

    # Alice pays 100,000 VND for all 3 members (EQUAL)
    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})
    exp_res = client.post(
        f"/api/v1/groups/{group_id}/expenses",
        json={
            "title": "Bữa tối lẩu Thái",
            "total_amount": 100000,
            "payment_source": "MEMBER",
            "paid_by_user_id": user_a["id"],
            "split_method": "EQUAL",
            "splits": [
                {"member_user_id": user_a["id"]},
                {"member_user_id": user_b["id"]},
                {"member_user_id": user_c["id"]},
            ],
        },
    )
    assert exp_res.status_code == 201
    expense = exp_res.json()
    splits = expense["splits"]
    assert len(splits) == 3

    # Check sum of splits equals total_amount exactly
    split_sum = sum(s["amount_owed"] for s in splits)
    assert split_sum == 100000
    # First split gets remainder (+1) -> 33,334
    assert splits[0]["amount_owed"] == 33334
    assert splits[1]["amount_owed"] == 33333
    assert splits[2]["amount_owed"] == 33333


def test_expense_custom_split_validation(client: TestClient):
    """
    Test CUSTOM split validation: sum mismatch must return 400 Bad Request.
    """
    uid = uuid.uuid4().hex[:6]
    user_a = create_user_and_login(client, f"alice_{uid}@example.com", "Alice Custom")
    user_b = create_user_and_login(client, f"bob_{uid}@example.com", "Bob Custom")

    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})
    g_res = client.post("/api/v1/groups", json={"name": "Nhóm Custom Split"})
    group_id = g_res.json()["id"]

    inv_res = client.post(f"/api/v1/groups/{group_id}/invitations", json={})
    token_b = inv_res.json()["raw_token"]

    client.post("/api/v1/auth/login", json={"email": f"bob_{uid}@example.com", "password": "Password123!"})
    client.post("/api/v1/groups/join", json={"token": token_b})

    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})

    # Mismatch: total 100,000 but sum is 40,000 + 50,000 = 90,000
    fail_res = client.post(
        f"/api/v1/groups/{group_id}/expenses",
        json={
            "title": "Vé xem phim",
            "total_amount": 100000,
            "payment_source": "MEMBER",
            "paid_by_user_id": user_a["id"],
            "split_method": "CUSTOM",
            "splits": [
                {"member_user_id": user_a["id"], "amount": 40000},
                {"member_user_id": user_b["id"], "amount": 50000},
            ],
        },
    )
    assert fail_res.status_code == 400
    assert "không khớp" in fail_res.json()["detail"]

    # Match: 40,000 + 60,000 = 100,000 -> Success
    ok_res = client.post(
        f"/api/v1/groups/{group_id}/expenses",
        json={
            "title": "Vé xem phim",
            "total_amount": 100000,
            "payment_source": "MEMBER",
            "paid_by_user_id": user_a["id"],
            "split_method": "CUSTOM",
            "splits": [
                {"member_user_id": user_a["id"], "amount": 40000},
                {"member_user_id": user_b["id"], "amount": 60000},
            ],
        },
    )
    assert ok_res.status_code == 201


def test_void_expense_removes_from_debt_calculation(client: TestClient):
    """
    Test VOID expense: once voided, it should no longer affect debt balances.
    """
    uid = uuid.uuid4().hex[:6]
    user_a = create_user_and_login(client, f"alice_{uid}@example.com", "Alice Void")
    user_b = create_user_and_login(client, f"bob_{uid}@example.com", "Bob Void")

    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})
    g_res = client.post("/api/v1/groups", json={"name": "Nhóm Test Void"})
    group_id = g_res.json()["id"]

    inv_res = client.post(f"/api/v1/groups/{group_id}/invitations", json={})
    token_b = inv_res.json()["raw_token"]

    client.post("/api/v1/auth/login", json={"email": f"bob_{uid}@example.com", "password": "Password123!"})
    client.post("/api/v1/groups/join", json={"token": token_b})

    # Alice posts an expense of 200,000 VND (100k each)
    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})
    exp_res = client.post(
        f"/api/v1/groups/{group_id}/expenses",
        json={
            "title": "Cà phê sáng",
            "total_amount": 200000,
            "payment_source": "MEMBER",
            "paid_by_user_id": user_a["id"],
            "split_method": "EQUAL",
            "splits": [
                {"member_user_id": user_a["id"]},
                {"member_user_id": user_b["id"]},
            ],
        },
    )
    expense_id = exp_res.json()["id"]

    # Before void: Alice is owed 100,000
    debts_res = client.get(f"/api/v1/groups/{group_id}/debts")
    assert debts_res.status_code == 200
    assert debts_res.json()["current_user_net"] == 100000

    # Void the expense
    void_res = client.post(
        f"/api/v1/groups/{group_id}/expenses/{expense_id}/void",
        json={"reason": "Ghi nhầm hóa đơn"},
    )
    assert void_res.status_code == 200
    assert void_res.json()["status"] == "VOID"

    # After void: Net balance should be 0!
    debts_res2 = client.get(f"/api/v1/groups/{group_id}/debts")
    assert debts_res2.json()["current_user_net"] == 0


def test_group_fund_operations_and_non_negative_balance(client: TestClient):
    """
    Test Fund Deposit, Expense from Fund, and Non-negative fund balance policy.
    """
    uid = uuid.uuid4().hex[:6]
    user_a = create_user_and_login(client, f"alice_{uid}@example.com", "Alice Fund")
    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})
    g_res = client.post("/api/v1/groups", json={"name": "Nhóm Quỹ Chung"})
    group_id = g_res.json()["id"]

    # Check initial fund balance: 0
    fund_res = client.get(f"/api/v1/groups/{group_id}/fund")
    assert fund_res.status_code == 200
    assert fund_res.json()["balance"] == 0

    # Contribute 500,000 VND
    contrib_res = client.post(
        f"/api/v1/groups/{group_id}/fund/contributions",
        json={"amount": 500000, "description": "Góp quỹ tháng 10"},
    )
    assert contrib_res.status_code == 201

    # Check balance now: 500,000
    fund_res2 = client.get(f"/api/v1/groups/{group_id}/fund")
    assert fund_res2.json()["balance"] == 500000

    # Spend 200,000 VND from Fund
    exp_res = client.post(
        f"/api/v1/groups/{group_id}/expenses",
        json={
            "title": "Mua nước ngọt cho cả nhóm",
            "total_amount": 200000,
            "payment_source": "FUND",
            "split_method": "EQUAL",
            "splits": [{"member_user_id": user_a["id"]}],
        },
    )
    assert exp_res.status_code == 201

    # Check balance now: 300,000
    fund_res3 = client.get(f"/api/v1/groups/{group_id}/fund")
    assert fund_res3.json()["balance"] == 300000

    # Try to spend 400,000 VND from Fund -> Must fail (insufficient balance)
    overdraft_res = client.post(
        f"/api/v1/groups/{group_id}/expenses",
        json={
            "title": "Mua đồ xa xỉ",
            "total_amount": 400000,
            "payment_source": "FUND",
            "split_method": "EQUAL",
            "splits": [{"member_user_id": user_a["id"]}],
        },
    )
    assert overdraft_res.status_code == 400
    assert "Số dư quỹ không đủ" in overdraft_res.json()["detail"]


def test_debt_calculation_and_settlement_lifecycle(client: TestClient):
    """
    Test end-to-end debt calculation and settlement state machine:
    Alice pays 300k for Alice, Bob, Charlie (100k each).
    Net before settlement:
      Alice: +200k
      Bob: -100k
      Charlie: -100k
    Bob settles 100k to Alice.
    Pending does not alter confirmed net.
    Once Alice confirms, Bob's net becomes 0 and Alice's net becomes +100k.
    """
    uid = uuid.uuid4().hex[:6]
    user_a = create_user_and_login(client, f"alice_{uid}@example.com", "Alice Settle")
    user_b = create_user_and_login(client, f"bob_{uid}@example.com", "Bob Settle")
    user_c = create_user_and_login(client, f"charlie_{uid}@example.com", "Charlie Settle")

    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})
    g_res = client.post("/api/v1/groups", json={"name": "Nhóm Du Lịch Settle"})
    group_id = g_res.json()["id"]

    inv_b = client.post(f"/api/v1/groups/{group_id}/invitations", json={}).json()["raw_token"]
    inv_c = client.post(f"/api/v1/groups/{group_id}/invitations", json={}).json()["raw_token"]

    client.post("/api/v1/auth/login", json={"email": f"bob_{uid}@example.com", "password": "Password123!"})
    client.post("/api/v1/groups/join", json={"token": inv_b})

    client.post("/api/v1/auth/login", json={"email": f"charlie_{uid}@example.com", "password": "Password123!"})
    client.post("/api/v1/groups/join", json={"token": inv_c})

    # Alice pays 300,000 for all 3
    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})
    client.post(
        f"/api/v1/groups/{group_id}/expenses",
        json={
            "title": "Thuê xe máy",
            "total_amount": 300000,
            "payment_source": "MEMBER",
            "paid_by_user_id": user_a["id"],
            "split_method": "EQUAL",
            "splits": [
                {"member_user_id": user_a["id"]},
                {"member_user_id": user_b["id"]},
                {"member_user_id": user_c["id"]},
            ],
        },
    )

    # Check Alice's net: +200,000
    debts = client.get(f"/api/v1/groups/{group_id}/debts").json()
    assert debts["current_user_net"] == 200000

    # Bob creates settlement of 100,000 to Alice
    client.post("/api/v1/auth/login", json={"email": f"bob_{uid}@example.com", "password": "Password123!"})
    settle_res = client.post(
        f"/api/v1/groups/{group_id}/settlements",
        json={"to_user_id": user_a["id"], "amount": 100000, "note": "Chuyển khoản VCB"},
    )
    assert settle_res.status_code == 201
    settlement_id = settle_res.json()["id"]
    assert settle_res.json()["status"] == "PENDING"

    # Bob checks net while settlement is PENDING: still -100,000 (pending does not alter confirmed debt)
    bob_debts = client.get(f"/api/v1/groups/{group_id}/debts").json()
    assert bob_debts["current_user_net"] == -100000

    # Security check: Charlie cannot confirm this settlement (only Alice / recipient can)
    client.post("/api/v1/auth/login", json={"email": f"charlie_{uid}@example.com", "password": "Password123!"})
    bad_confirm = client.post(f"/api/v1/groups/{group_id}/settlements/{settlement_id}/confirm")
    assert bad_confirm.status_code == 403

    # Alice confirms the settlement
    client.post("/api/v1/auth/login", json={"email": f"alice_{uid}@example.com", "password": "Password123!"})
    confirm_res = client.post(f"/api/v1/groups/{group_id}/settlements/{settlement_id}/confirm")
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CONFIRMED"

    # Alice's net after confirmation: 200,000 - 100,000 = +100,000
    alice_debts_after = client.get(f"/api/v1/groups/{group_id}/debts").json()
    assert alice_debts_after["current_user_net"] == 100000

    # Bob's net after confirmation: -100,000 + 100,000 = 0 (Balanced!)
    client.post("/api/v1/auth/login", json={"email": f"bob_{uid}@example.com", "password": "Password123!"})
    bob_debts_after = client.get(f"/api/v1/groups/{group_id}/debts").json()
    assert bob_debts_after["current_user_net"] == 0
