import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings


@pytest.fixture
def auth_client():
    client = TestClient(app)
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Password123!", "display_name": "User PF A"},
    )
    return client


@pytest.fixture
def other_client():
    client = TestClient(app)
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Password123!", "display_name": "User PF B"},
    )
    return client


def test_wallet_creation_and_isolation(auth_client, other_client):
    # User A creates wallet
    wallet_res = auth_client.post(
        "/api/v1/wallets",
        json={"name": "Ví Tiền Mặt", "wallet_type": "CASH", "opening_balance": 500000},
    )
    assert wallet_res.status_code == 201
    wallet_a = wallet_res.json()
    assert wallet_a["name"] == "Ví Tiền Mặt"
    assert wallet_a["opening_balance"] == 500000

    # User A gets wallet list
    list_a = auth_client.get("/api/v1/wallets").json()
    assert any(w["id"] == wallet_a["id"] for w in list_a)

    # User B cannot see User A's wallet
    list_b = other_client.get("/api/v1/wallets").json()
    assert not any(w["id"] == wallet_a["id"] for w in list_b)

    # User B cannot access User A's wallet detail
    unauth_detail = other_client.get(f"/api/v1/wallets/{wallet_a['id']}")
    assert unauth_detail.status_code == 404


def test_categories_system_and_custom(auth_client, other_client):
    # Fetch categories for User A
    res = auth_client.get("/api/v1/categories")
    assert res.status_code == 200
    categories = res.json()
    assert len(categories) >= 10
    # System category exists
    assert any(c["name"] == "Ăn uống" and c["is_system"] for c in categories)

    # Create custom category for User A
    custom_res = auth_client.post(
        "/api/v1/categories",
        json={"name": "Đầu tư học tập", "kind": "EXPENSE", "icon_key": "book"},
    )
    assert custom_res.status_code == 201
    custom_cat = custom_res.json()
    assert custom_cat["name"] == "Đầu tư học tập"
    assert not custom_cat["is_system"]

    # User B cannot see User A's custom category
    res_b = other_client.get("/api/v1/categories").json()
    assert not any(c["id"] == custom_cat["id"] for c in res_b)


def test_income_and_expense_transactions(auth_client):
    # Create wallet with 1,000,000 opening balance
    w = auth_client.post(
        "/api/v1/wallets",
        json={"name": "Tài khoản VCB", "wallet_type": "BANK", "opening_balance": 1000000},
    ).json()

    # 1. Add Income: 500,000
    inc_res = auth_client.post(
        "/api/v1/transactions",
        json={
            "wallet_id": w["id"],
            "transaction_type": "INCOME",
            "amount": 500000,
            "description": "Thưởng dự án",
        },
    )
    assert inc_res.status_code == 201

    # Check balance: 1,000,000 + 500,000 = 1,500,000
    detail = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert detail["current_balance"] == 1500000

    # 2. Add Expense: 200,000
    exp_res = auth_client.post(
        "/api/v1/transactions",
        json={
            "wallet_id": w["id"],
            "transaction_type": "EXPENSE",
            "amount": 200000,
            "description": "Ăn tối",
        },
    )
    assert exp_res.status_code == 201

    # Check balance: 1,500,000 - 200,000 = 1,300,000
    detail2 = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert detail2["current_balance"] == 1300000


def test_atomic_transfer_between_wallets(auth_client):
    """
    Test Business Rule C (from 02_QUY_TAC_NGHIEP_VU.md):
    Chuyển 200.000 VND từ ví tiền mặt sang ví ngân hàng.
    Ví tiền mặt giảm 200.000, ví ngân hàng tăng 200.000;
    tổng tài sản tiền mặt của hai ví không đổi.
    Báo cáo chi tiêu cá nhân không cộng 200.000 này.
    """
    w1 = auth_client.post(
        "/api/v1/wallets",
        json={"name": "Ví Tiền Mặt", "opening_balance": 500000},
    ).json()

    w2 = auth_client.post(
        "/api/v1/wallets",
        json={"name": "Ví Ngân Hàng", "opening_balance": 300000},
    ).json()

    # Execute transfer 200,000 from w1 to w2
    transfer_res = auth_client.post(
        "/api/v1/transactions/transfer",
        json={
            "source_wallet_id": w1["id"],
            "destination_wallet_id": w2["id"],
            "amount": 200000,
            "description": "Nạp tiền ngân hàng",
        },
    )
    assert transfer_res.status_code == 201
    transfers = transfer_res.json()
    assert len(transfers) == 2
    tx_out, tx_in = transfers

    assert tx_out["transaction_type"] == "TRANSFER_OUT"
    assert tx_out["amount"] == 200000
    assert tx_in["transaction_type"] == "TRANSFER_IN"
    assert tx_in["amount"] == 200000
    assert tx_out["transfer_group_id"] == tx_in["transfer_group_id"]

    # Verify w1 balance: 500,000 - 200,000 = 300,000
    w1_bal = auth_client.get(f"/api/v1/wallets/{w1['id']}").json()["current_balance"]
    assert w1_bal == 300000

    # Verify w2 balance: 300,000 + 200,000 = 500,000
    w2_bal = auth_client.get(f"/api/v1/wallets/{w2['id']}").json()["current_balance"]
    assert w2_bal == 500000

    # Total assets: 300,000 + 500,000 = 800,000 (remains identical to initial 500k + 300k)
    summary = auth_client.get("/api/v1/transactions/summary").json()
    assert summary["total_assets"] == 800000
    # Crucial: transfer is NOT counted as income or expense!
    assert summary["total_income"] == 0
    assert summary["total_expense"] == 0


def test_transfer_insufficient_funds_fails(auth_client):
    w1 = auth_client.post(
        "/api/v1/wallets",
        json={"name": "Ví Ít Tiền", "opening_balance": 50000},
    ).json()

    w2 = auth_client.post(
        "/api/v1/wallets",
        json={"name": "Ví Khác", "opening_balance": 0},
    ).json()

    # Attempt to transfer 100,000 when balance is only 50,000
    res = auth_client.post(
        "/api/v1/transactions/transfer",
        json={
            "source_wallet_id": w1["id"],
            "destination_wallet_id": w2["id"],
            "amount": 100000,
        },
    )
    assert res.status_code == 400
    assert "Số dư ví nguồn không đủ" in res.json()["detail"]


def test_cannot_transact_on_another_users_wallet(auth_client, other_client):
    w_b = other_client.post(
        "/api/v1/wallets",
        json={"name": "Ví của B", "opening_balance": 100000},
    ).json()

    # User A attempts to add transaction to User B's wallet
    res = auth_client.post(
        "/api/v1/transactions",
        json={
            "wallet_id": w_b["id"],
            "transaction_type": "EXPENSE",
            "amount": 50000,
        },
    )
    assert res.status_code == 404

