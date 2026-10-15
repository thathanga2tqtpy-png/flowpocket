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


def test_group_expense_with_personal_wallet_deduction_and_refund(client: TestClient):
    """
    Test that creating a group expense with payer_wallet_id:
    1. Deducts amount from the user's personal wallet atomically.
    2. Records a WalletTransaction with source_type='GROUP_EXPENSE'.
    3. When voiding the group expense, automatically refunds the wallet.
    """
    uid = uuid.uuid4().hex[:6]
    user_a = create_user_and_login(client, f"payer_{uid}@example.com", "Payer User")
    client.post("/api/v1/auth/login", json={"email": f"payer_{uid}@example.com", "password": "Password123!"})

    # 1. Create a personal wallet with 1,000,000 VND
    wallet_res = client.post(
        "/api/v1/wallets",
        json={"name": "Ví Momo", "wallet_type": "E_WALLET", "currency": "VND", "opening_balance": 1000000},
    )
    assert wallet_res.status_code == 201
    wallet_id = wallet_res.json()["id"]

    # Verify initial wallet balance is 1,000,000
    wallets_list = client.get("/api/v1/wallets").json()
    momo_wallet = next(w for w in wallets_list if w["id"] == wallet_id)
    assert momo_wallet["current_balance"] == 1000000

    # 2. Create a group and add a member
    g_res = client.post("/api/v1/groups", json={"name": "Nhóm Đi Ăn Trưa"})
    group_id = g_res.json()["id"]

    # 3. Create a group expense of 300,000 VND, paying from personal wallet
    exp_res = client.post(
        f"/api/v1/groups/{group_id}/expenses",
        json={
            "title": "Ăn trưa lẩu dê",
            "total_amount": 300000,
            "payment_source": "MEMBER",
            "paid_by_user_id": user_a["id"],
            "payer_wallet_id": wallet_id,
            "split_method": "EQUAL",
            "splits": [{"member_user_id": user_a["id"]}],
        },
    )
    assert exp_res.status_code == 201
    expense_id = exp_res.json()["id"]

    # 4. Verify wallet balance is now 1,000,000 - 300,000 = 700,000 VND
    wallets_after_expense = client.get("/api/v1/wallets").json()
    momo_after = next(w for w in wallets_after_expense if w["id"] == wallet_id)
    assert momo_after["current_balance"] == 700000

    # 5. Void the expense
    void_res = client.post(
        f"/api/v1/groups/{group_id}/expenses/{expense_id}/void",
        json={"reason": "Tính nhầm hóa đơn"},
    )
    assert void_res.status_code == 200

    # 6. Verify wallet balance is refunded back to 1,000,000 VND
    wallets_after_void = client.get("/api/v1/wallets").json()
    momo_refunded = next(w for w in wallets_after_void if w["id"] == wallet_id)
    assert momo_refunded["current_balance"] == 1000000


def test_settlement_wallet_deduction_and_receipt_credit(client: TestClient):
    """
    Test Settlement wallet lifecycle:
    1. Payer creates settlement with payer_wallet_id -> personal wallet deducted.
    2. Recipient confirms settlement with recipient_wallet_id -> personal wallet credited.
    """
    uid = uuid.uuid4().hex[:6]
    alice = create_user_and_login(client, f"alice_st_{uid}@example.com", "Alice S")
    bob = create_user_and_login(client, f"bob_st_{uid}@example.com", "Bob S")

    # 1. Alice creates group and invites Bob
    client.post("/api/v1/auth/login", json={"email": f"alice_st_{uid}@example.com", "password": "Password123!"})
    g_res = client.post("/api/v1/groups", json={"name": "Nhóm Quyết Toán"})
    group_id = g_res.json()["id"]

    inv_res = client.post(f"/api/v1/groups/{group_id}/invitations", json={"role": "MEMBER"})
    token = inv_res.json()["raw_token"]

    # Alice creates a wallet with 200k
    alice_w_res = client.post(
        "/api/v1/wallets",
        json={"name": "Ví VCB Alice", "wallet_type": "BANK", "currency": "VND", "opening_balance": 200000},
    )
    alice_wallet_id = alice_w_res.json()["id"]

    # Bob joins group and creates a wallet with 500k
    client.post("/api/v1/auth/login", json={"email": f"bob_st_{uid}@example.com", "password": "Password123!"})
    client.post("/api/v1/groups/join", json={"token": token})

    bob_w_res = client.post(
        "/api/v1/wallets",
        json={"name": "Ví Momo Bob", "wallet_type": "E_WALLET", "currency": "VND", "opening_balance": 500000},
    )
    bob_wallet_id = bob_w_res.json()["id"]

    # 2. Bob creates settlement of 150,000 VND to Alice, deducted from Bob's wallet
    settle_res = client.post(
        f"/api/v1/groups/{group_id}/settlements",
        json={
            "to_user_id": alice["id"],
            "amount": 150000,
            "note": "Trả tiền ăn trưa qua Momo",
            "payer_wallet_id": bob_wallet_id,
        },
    )
    assert settle_res.status_code == 201
    settlement_id = settle_res.json()["id"]

    # Bob's wallet balance must now be 500k - 150k = 350k
    bob_wallets = client.get("/api/v1/wallets").json()
    bob_momo = next(w for w in bob_wallets if w["id"] == bob_wallet_id)
    assert bob_momo["current_balance"] == 350000

    # 3. Alice confirms receipt, crediting into Alice's wallet
    client.post("/api/v1/auth/login", json={"email": f"alice_st_{uid}@example.com", "password": "Password123!"})
    confirm_res = client.post(
        f"/api/v1/groups/{group_id}/settlements/{settlement_id}/confirm",
        json={"recipient_wallet_id": alice_wallet_id},
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CONFIRMED"

    # Alice's wallet balance must now be 200k + 150k = 350k
    alice_wallets = client.get("/api/v1/wallets").json()
    alice_vcb = next(w for w in alice_wallets if w["id"] == alice_wallet_id)
    assert alice_vcb["current_balance"] == 350000


def test_group_net_expense_accounting_and_no_unclassified(client: TestClient):
    """
    Test Net Expense & Category accounting:
    1. Alice pays 300k from personal wallet for Alice and Bob (split 150k each).
       At this moment, Alice's personal summary:
       - total_expense = 300k
       - category = 'Chi tiêu nhóm' (no 'Chưa phân loại'!)
    2. Bob pays back 150k to Alice. Alice confirms to wallet.
       After reimbursement:
       - Alice's total_expense = 300k - 150k = 150k (Net Expense!)
       - Alice's total_income = 0 (reimbursement is NOT counted as income!)
       - Bob's total_expense = 150k (debt payment is counted as Bob's real expense!)
    """
    uid = uuid.uuid4().hex[:6]
    alice = create_user_and_login(client, f"alice_net_{uid}@example.com", "Alice Net")
    bob = create_user_and_login(client, f"bob_net_{uid}@example.com", "Bob Net")

    # Alice creates wallet with 1,000,000 VND
    client.post("/api/v1/auth/login", json={"email": f"alice_net_{uid}@example.com", "password": "Password123!"})
    alice_w = client.post("/api/v1/wallets", json={"name": "Ví Alice", "opening_balance": 1000000}).json()

    # Bob creates wallet with 500,000 VND
    client.post("/api/v1/auth/login", json={"email": f"bob_net_{uid}@example.com", "password": "Password123!"})
    bob_w = client.post("/api/v1/wallets", json={"name": "Ví Bob", "opening_balance": 500000}).json()

    # Alice creates group and invites Bob
    client.post("/api/v1/auth/login", json={"email": f"alice_net_{uid}@example.com", "password": "Password123!"})
    g_res = client.post("/api/v1/groups", json={"name": "Phòng Trọ 308"}).json()
    group_id = g_res["id"]
    token = client.post(f"/api/v1/groups/{group_id}/invitations", json={}).json()["raw_token"]

    # Bob joins
    client.post("/api/v1/auth/login", json={"email": f"bob_net_{uid}@example.com", "password": "Password123!"})
    client.post("/api/v1/groups/join", json={"token": token})

    # 1. Alice pays 300,000 VND for dinner (split 150k each) from wallet
    client.post("/api/v1/auth/login", json={"email": f"alice_net_{uid}@example.com", "password": "Password123!"})
    client.post(
        f"/api/v1/groups/{group_id}/expenses",
        json={
            "title": "Ăn tối lẩu dê",
            "total_amount": 300000,
            "payment_source": "MEMBER",
            "paid_by_user_id": alice["id"],
            "payer_wallet_id": alice_w["id"],
            "split_method": "EQUAL",
            "splits": [
                {"member_user_id": alice["id"]},
                {"member_user_id": bob["id"]},
            ],
        },
    )

    # Check Alice summary before reimbursement
    summary_before = client.get("/api/v1/transactions/summary").json()
    assert summary_before["total_expense"] == 300000
    assert summary_before["total_income"] == 0
    # Must NOT have "Chưa phân loại"
    breakdown_names = [b["category_name"] for b in summary_before["expense_breakdown"]]
    assert "Chưa phân loại" not in breakdown_names
    assert "Chi tiêu nhóm" in breakdown_names

    # 2. Bob creates settlement of 150,000 VND to Alice
    client.post("/api/v1/auth/login", json={"email": f"bob_net_{uid}@example.com", "password": "Password123!"})
    st_res = client.post(
        f"/api/v1/groups/{group_id}/settlements",
        json={
            "to_user_id": alice["id"],
            "amount": 150000,
            "payer_wallet_id": bob_w["id"],
        },
    ).json()

    # Alice confirms receipt into wallet
    client.post("/api/v1/auth/login", json={"email": f"alice_net_{uid}@example.com", "password": "Password123!"})
    client.post(
        f"/api/v1/groups/{group_id}/settlements/{st_res['id']}/confirm",
        json={"recipient_wallet_id": alice_w["id"]},
    )

    # 3. VERIFY ALICE'S FINANCIAL SUMMARY: Net Expense is 150,000 VND! Income remains 0!
    summary_after = client.get("/api/v1/transactions/summary").json()
    assert summary_after["total_expense"] == 150000  # 300k - 150k reimbursement = 150k!
    assert summary_after["total_income"] == 0         # Reimbursement is NOT income!
    group_cat = next(b for b in summary_after["expense_breakdown"] if b["category_name"] == "Chi tiêu nhóm")
    assert group_cat["total_amount"] == 150000

    # 4. VERIFY BOB'S FINANCIAL SUMMARY: Debt payment of 150k is counted as expense!
    client.post("/api/v1/auth/login", json={"email": f"bob_net_{uid}@example.com", "password": "Password123!"})
    bob_summary = client.get("/api/v1/transactions/summary").json()
    assert bob_summary["total_expense"] == 150000
    assert bob_summary["total_income"] == 0



