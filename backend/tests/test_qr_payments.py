import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.vietqr import verify_vietqr_payload


@pytest.fixture
def auth_client():
    client = TestClient(app)
    unique_email = f"qr_user_a_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Password123!", "display_name": "QR User A"},
    )
    return client


@pytest.fixture
def other_client():
    client = TestClient(app)
    unique_email = f"qr_user_b_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Password123!", "display_name": "QR User B"},
    )
    return client


def test_get_supported_banks(auth_client):
    res = auth_client.get("/api/v1/qr-payments/banks")
    assert res.status_code == 200
    banks = res.json()
    assert len(banks) >= 20
    codes = [b["code"] for b in banks]
    assert "VCB" in codes
    assert "MB" in codes
    assert "TCB" in codes


def test_receiving_account_crud_and_isolation(auth_client, other_client):
    # 1. User A creates wallet
    wallet_res = auth_client.post(
        "/api/v1/wallets",
        json={"name": "Ví Techcombank", "wallet_type": "BANK", "opening_balance": 1000000},
    )
    assert wallet_res.status_code == 201
    wallet_id = wallet_res.json()["id"]

    # 2. User A creates receiving account
    acc_res = auth_client.post(
        "/api/v1/qr-payments/receiving-accounts",
        json={
            "bank_code": "TCB",
            "account_number": "19036788889999",
            "account_holder_name": "nguyen van a",
            "display_name": "TK Techcombank Chinh",
            "linked_wallet_id": wallet_id,
        },
    )
    assert acc_res.status_code == 201
    acc_data = acc_res.json()
    account_id = acc_data["id"]
    assert acc_data["bank_code"] == "TCB"
    assert acc_data["account_holder_name"] == "NGUYEN VAN A"
    assert acc_data["masked_account_number"] == "•••• 9999"
    assert acc_data["is_default"] is True  # First account becomes default

    # 3. User A updates receiving account (change STK, bank, wallet link, display name)
    w2 = auth_client.post(
        "/api/v1/wallets",
        json={"name": "Ví Mới Tạo", "wallet_type": "BANK", "opening_balance": 200000},
    ).json()

    update_res = auth_client.put(
        f"/api/v1/qr-payments/receiving-accounts/{account_id}",
        json={
            "bank_code": "MB",
            "account_number": "0888999777",
            "account_holder_name": "nguyen van a updated",
            "display_name": "TK MB Moi",
            "linked_wallet_id": w2["id"],
        },
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["bank_code"] == "MB"
    assert updated_data["account_number"] == "0888999777"
    assert updated_data["masked_account_number"] == "•••• 9777"
    assert updated_data["account_holder_name"] == "NGUYEN VAN A UPDATED"
    assert updated_data["display_name"] == "TK MB Moi"
    assert updated_data["linked_wallet_id"] == w2["id"]

    # 4. User B cannot see User A's receiving account
    other_list = other_client.get("/api/v1/qr-payments/receiving-accounts").json()
    assert not any(a["id"] == account_id for a in other_list)

    # 5. User B cannot get, update or delete User A's receiving account
    assert other_client.get(f"/api/v1/qr-payments/receiving-accounts/{account_id}").status_code == 404
    assert other_client.put(f"/api/v1/qr-payments/receiving-accounts/{account_id}", json={"display_name": "Hack"}).status_code == 404
    assert other_client.delete(f"/api/v1/qr-payments/receiving-accounts/{account_id}").status_code == 404


def test_create_payment_request_and_vietqr_payload(auth_client):
    # Setup wallet and account
    w = auth_client.post("/api/v1/wallets", json={"name": "Ví VCB", "wallet_type": "BANK", "opening_balance": 500000}).json()
    acc = auth_client.post(
        "/api/v1/qr-payments/receiving-accounts",
        json={
            "bank_code": "VCB",
            "account_number": "0011004321987",
            "account_holder_name": "TRAN VAN B",
            "linked_wallet_id": w["id"],
        },
    ).json()

    # Get an INCOME category
    cats = auth_client.get("/api/v1/categories").json()
    income_cat = next((c for c in cats if c["kind"] == "INCOME"), None)
    cat_id = income_cat["id"] if income_cat else None

    # Create payment request with category
    expected_amount = 250000
    req_res = auth_client.post(
        "/api/v1/qr-payments/requests",
        json={
            "receiving_account_id": acc["id"],
            "target_wallet_id": w["id"],
            "expected_amount": expected_amount,
            "category_id": cat_id,
            "description": "Tien an trua",
            "transfer_memo": "An trua BBQ",
        },
    )
    assert req_res.status_code == 201
    req_data = req_res.json()
    assert req_data["status"] == "PENDING"
    assert req_data["expected_amount"] == 250000
    assert req_data["actual_amount"] is None
    assert req_data["reference_code"].startswith("FP")

    # Verify QR payload is a valid VietQR EMVCo string
    payload = req_data["qr_payload"]
    assert payload.startswith("000201")
    assert verify_vietqr_payload(payload) is True
    # Napas BIN for Vietcombank is 970436
    assert "970436" in payload
    assert "0011004321987" in payload

    # Verify wallet balance has NOT changed yet (still 500000)
    w_check = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert w_check["current_balance"] == 500000


def test_cancel_payment_request(auth_client):
    w = auth_client.post("/api/v1/wallets", json={"name": "Ví Test Cancel", "wallet_type": "CASH", "opening_balance": 100000}).json()
    acc = auth_client.post(
        "/api/v1/qr-payments/receiving-accounts",
        json={"bank_code": "MB", "account_number": "0987654321", "account_holder_name": "LE THI C", "linked_wallet_id": w["id"]},
    ).json()

    req = auth_client.post(
        "/api/v1/qr-payments/requests",
        json={"receiving_account_id": acc["id"], "target_wallet_id": w["id"], "expected_amount": 100000},
    ).json()

    cancel_res = auth_client.post(f"/api/v1/qr-payments/requests/{req['id']}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Cannot confirm cancelled request
    confirm_res = auth_client.post(
        f"/api/v1/qr-payments/requests/{req['id']}/confirm",
        json={"actual_amount": 100000},
    )
    assert confirm_res.status_code == 400


def test_confirm_payment_exact_amount(auth_client):
    w = auth_client.post("/api/v1/wallets", json={"name": "Ví Nhận Chuẩn", "wallet_type": "BANK", "opening_balance": 200000}).json()
    acc = auth_client.post(
        "/api/v1/qr-payments/receiving-accounts",
        json={"bank_code": "ACB", "account_number": "12345678", "account_holder_name": "PHAM VAN D", "linked_wallet_id": w["id"]},
    ).json()

    req = auth_client.post(
        "/api/v1/qr-payments/requests",
        json={"receiving_account_id": acc["id"], "target_wallet_id": w["id"], "expected_amount": 150000, "description": "Tien ban sach"},
    ).json()

    confirm_res = auth_client.post(
        f"/api/v1/qr-payments/requests/{req['id']}/confirm",
        json={"actual_amount": 150000, "notes": "Khach chuyen khoan du"},
    )
    assert confirm_res.status_code == 200
    data = confirm_res.json()
    assert data["status"] == "USER_CONFIRMED"
    assert data["actual_amount"] == 150000
    assert data["confirmed_at"] is not None
    assert data["reconciliation"] is None  # No difference

    # Check wallet balance increased by 150000 -> 350000
    w_check = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert w_check["current_balance"] == 350000

    # Check transaction history contains INCOME
    txs = auth_client.get(f"/api/v1/transactions?wallet_id={w['id']}").json()
    assert any(tx["amount"] == 150000 and tx["transaction_type"] == "INCOME" for tx in txs)

    # Double confirmation should fail
    dup_res = auth_client.post(
        f"/api/v1/qr-payments/requests/{req['id']}/confirm",
        json={"actual_amount": 150000},
    )
    assert dup_res.status_code == 400


def test_confirm_payment_shortfall_and_reconciliation(auth_client):
    w = auth_client.post("/api/v1/wallets", json={"name": "Ví Lệch Thiếu", "wallet_type": "BANK", "opening_balance": 100000}).json()
    acc = auth_client.post(
        "/api/v1/qr-payments/receiving-accounts",
        json={"bank_code": "VPB", "account_number": "999888777", "account_holder_name": "HOANG VAN E", "linked_wallet_id": w["id"]},
    ).json()

    # Expecting 200,000 VND
    req = auth_client.post(
        "/api/v1/qr-payments/requests",
        json={"receiving_account_id": acc["id"], "target_wallet_id": w["id"], "expected_amount": 200000, "description": "Tien hoc phi"},
    ).json()

    # Actually received 180,000 VND (shortfall of 20,000 VND)
    confirm_res = auth_client.post(
        f"/api/v1/qr-payments/requests/{req['id']}/confirm",
        json={"actual_amount": 180000, "notes": "Ban ay bi tru phi giao dich ngan hang"},
    )
    assert confirm_res.status_code == 200
    data = confirm_res.json()
    assert data["status"] == "USER_CONFIRMED"
    assert data["actual_amount"] == 180000
    assert data["reconciliation"] is not None
    recon = data["reconciliation"]
    assert recon["difference_type"] == "SHORTFALL"
    assert recon["difference_amount"] == -20000
    assert recon["status"] == "OPEN"

    # Wallet balance increased by actual amount 180000 -> 280000
    w_check = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert w_check["current_balance"] == 280000

    # User can list and update reconciliation status
    recon_list = auth_client.get("/api/v1/qr-payments/reconciliations?status=OPEN").json()
    assert any(r["id"] == recon["id"] for r in recon_list)

    update_res = auth_client.put(
        f"/api/v1/qr-payments/reconciliations/{recon['id']}",
        json={"status": "RESOLVED", "notes": "Da bu them tien mat ngoai doi"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "RESOLVED"
    assert update_res.json()["resolved_at"] is not None


def test_confirm_payment_overpayment(auth_client):
    w = auth_client.post("/api/v1/wallets", json={"name": "Ví Lệch Thừa", "wallet_type": "BANK", "opening_balance": 50000}).json()
    acc = auth_client.post(
        "/api/v1/qr-payments/receiving-accounts",
        json={"bank_code": "TPB", "account_number": "111222333", "account_holder_name": "VU VAN F", "linked_wallet_id": w["id"]},
    ).json()

    # Expected 100,000 VND, actual received 120,000 VND
    req = auth_client.post(
        "/api/v1/qr-payments/requests",
        json={"receiving_account_id": acc["id"], "target_wallet_id": w["id"], "expected_amount": 100000},
    ).json()

    confirm_res = auth_client.post(
        f"/api/v1/qr-payments/requests/{req['id']}/confirm",
        json={"actual_amount": 120000, "notes": "Típ thêm 20k"},
    )
    assert confirm_res.status_code == 200
    data = confirm_res.json()
    assert data["status"] == "USER_CONFIRMED"
    assert data["reconciliation"]["difference_type"] == "OVERPAYMENT"
    assert data["reconciliation"]["difference_amount"] == 20000

    # Wallet updated with 120000 -> 170000
    w_check = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert w_check["current_balance"] == 170000


def test_parse_vietqr_endpoint(auth_client):
    from app.core.vietqr import generate_vietqr_payload

    # Create payload: Techcombank (970407), STK 1903678888, 350000 VND, memo "Tien com nieu"
    sample_qr = generate_vietqr_payload(
        bank_code="TCB",
        account_number="1903678888",
        amount=350000,
        memo="Tien com nieu",
    )

    parse_res = auth_client.post(
        "/api/v1/qr-payments/parse",
        json={"qr_payload": sample_qr},
    )
    assert parse_res.status_code == 200
    pdata = parse_res.json()
    assert pdata["is_valid_vietqr"] is True
    assert pdata["bank_code"] == "TCB"
    assert pdata["bank_bin"] == "970407"
    assert pdata["account_number"] == "1903678888"
    assert pdata["amount"] == 350000
    assert "Tien com nieu" in pdata["memo"]


def test_create_and_confirm_outgoing_payment(auth_client):
    # Setup wallet with 500,000 VND
    w = auth_client.post("/api/v1/wallets", json={"name": "Ví Chi QR", "wallet_type": "BANK", "opening_balance": 500000}).json()

    # 1. User scans QR and saves as PENDING
    create_res = auth_client.post(
        "/api/v1/qr-payments/outgoing",
        json={
            "wallet_id": w["id"],
            "amount": 75000,
            "description": "Tra tien an trua quan pho",
            "bank_code": "VCB",
            "bank_name": "Vietcombank",
            "account_number": "123456789",
            "account_holder_name": "CHU QUAN PHO",
        },
    )
    assert create_res.status_code == 201
    pending_item = create_res.json()
    assert pending_item["status"] == "PENDING"
    assert pending_item["amount"] == 75000

    # Wallet balance is NOT deducted yet
    w_check = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert w_check["current_balance"] == 500000

    # User lists pending payments
    pending_list = auth_client.get("/api/v1/qr-payments/outgoing?status=PENDING").json()
    assert pending_list["total_pending_amount"] >= 75000
    assert any(item["id"] == pending_item["id"] for item in pending_list["items"])

    # 2. User confirms payment (ticks checkbox)
    confirm_res = auth_client.post(f"/api/v1/qr-payments/outgoing/{pending_item['id']}/confirm")
    assert confirm_res.status_code == 200
    confirmed_data = confirm_res.json()
    assert confirmed_data["status"] == "CONFIRMED"
    assert confirmed_data["confirmed_at"] is not None

    # Wallet balance is now deducted: 500000 - 75000 = 425000
    w_check2 = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert w_check2["current_balance"] == 425000

    # Check transaction history
    txs = auth_client.get(f"/api/v1/transactions?wallet_id={w['id']}").json()
    assert any(tx["amount"] == 75000 and tx["transaction_type"] == "EXPENSE" for tx in txs)


def test_confirm_all_outgoing_payments(auth_client):
    w = auth_client.post("/api/v1/wallets", json={"name": "Ví Batch Confirm", "wallet_type": "BANK", "opening_balance": 1000000}).json()

    # Create 2 pending items
    auth_client.post(
        "/api/v1/qr-payments/outgoing",
        json={"wallet_id": w["id"], "amount": 30000, "description": "Ca phe sang"},
    )
    auth_client.post(
        "/api/v1/qr-payments/outgoing",
        json={"wallet_id": w["id"], "amount": 50000, "description": "Com trua"},
    )

    # End of day: confirm all
    confirm_all_res = auth_client.post("/api/v1/qr-payments/outgoing/confirm-all")
    assert confirm_all_res.status_code == 200
    confirmed_items = confirm_all_res.json()
    assert len(confirmed_items) >= 2
    assert all(i["status"] == "CONFIRMED" for i in confirmed_items)

    # Balance deducted by 80000 -> 920000
    w_check = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert w_check["current_balance"] == 920000


def test_cancel_outgoing_payment(auth_client):
    w = auth_client.post("/api/v1/wallets", json={"name": "Ví Cancel", "wallet_type": "BANK", "opening_balance": 200000}).json()

    res = auth_client.post(
        "/api/v1/qr-payments/outgoing",
        json={"wallet_id": w["id"], "amount": 40000, "description": "Khoan chi bi huy"},
    ).json()

    cancel_res = auth_client.post(f"/api/v1/qr-payments/outgoing/{res['id']}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Wallet not affected
    w_check = auth_client.get(f"/api/v1/wallets/{w['id']}").json()
    assert w_check["current_balance"] == 200000


def test_create_payment_request_directly_from_bank_wallet(auth_client):
    # 1. Create a bank wallet with banking fields directly
    w = auth_client.post(
        "/api/v1/wallets",
        json={
            "name": "MB Bank Chính",
            "wallet_type": "BANK",
            "opening_balance": 1000000,
            "bank_code": "MB",
            "bank_name": "Ngân hàng TMCP Quân đội (MB)",
            "account_number": "0987654321",
            "account_holder_name": "NGUYEN VAN FLOW",
        },
    ).json()
    assert w["bank_code"] == "MB"
    assert w["account_number"] == "0987654321"

    # 2. Create QR payment request without receiving_account_id
    req_res = auth_client.post(
        "/api/v1/qr-payments/requests",
        json={
            "target_wallet_id": w["id"],
            "expected_amount": 150000,
            "description": "Tien tra no ban be",
            "transfer_memo": "Tra no ban be",
        },
    )
    assert req_res.status_code == 201
    data = req_res.json()
    assert data["receiving_account_id"] is None
    assert data["bank_code_snapshot"] == "MB"
    assert data["account_number_snapshot"] == "0987654321"
    assert data["account_holder_snapshot"] == "NGUYEN VAN FLOW"
    assert data["qr_payload"].startswith("000201")
    assert data["status"] == "PENDING"

