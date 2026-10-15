import secrets
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.core.vietqr import SUPPORTED_BANKS, generate_vietqr_payload, clean_ascii_for_vietqr
from app.models.receiving_account import ReceivingAccount
from app.models.incoming_payment_request import IncomingPaymentRequest
from app.models.payment_reconciliation import PaymentReconciliation
from app.models.wallet import Wallet
from app.models.category import Category
from app.models.transaction import WalletTransaction
from app.schemas.qr_payment import (
    SupportedBank,
    ReceivingAccountCreate,
    ReceivingAccountUpdate,
    ReceivingAccountResponse,
    IncomingPaymentRequestCreate,
    IncomingPaymentRequestResponse,
    ConfirmPaymentReceivedRequest,
)
from app.services.qr_payments.constants import (
    DEFAULT_INCOME_CATEGORY_ID,
    to_account_response,
    to_request_response,
)


def get_supported_banks() -> List[SupportedBank]:
    return [
        SupportedBank(
            code=code,
            name=info["name"],
            bin=info["bin"],
            short_name=info["short_name"],
        )
        for code, info in SUPPORTED_BANKS.items()
    ]


def list_receiving_accounts(
    db: Session, user_id: uuid.UUID, active_only: bool = True
) -> List[ReceivingAccountResponse]:
    query = select(ReceivingAccount).where(ReceivingAccount.user_id == user_id)
    if active_only:
        query = query.where(ReceivingAccount.is_active == True)
    query = query.order_by(desc(ReceivingAccount.is_default), desc(ReceivingAccount.created_at))

    accounts = db.execute(query).scalars().all()
    return [to_account_response(acc) for acc in accounts]


def get_receiving_account(
    db: Session, user_id: uuid.UUID, account_id: uuid.UUID
) -> ReceivingAccount:
    acc = db.get(ReceivingAccount, account_id)
    if not acc or acc.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản nhận tiền",
        )
    return acc


def create_receiving_account(
    db: Session, user_id: uuid.UUID, data: ReceivingAccountCreate
) -> ReceivingAccountResponse:
    bank_info = SUPPORTED_BANKS.get(data.bank_code.upper())
    if not bank_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã ngân hàng '{data.bank_code}' không được hỗ trợ trong danh sách VietQR",
        )

    if data.linked_wallet_id:
        wallet = db.get(Wallet, data.linked_wallet_id)
        if not wallet or wallet.owner_user_id != user_id or wallet.is_archived:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ví liên kết không tồn tại hoặc đã bị lưu trữ",
            )

    has_any = (
        db.execute(select(ReceivingAccount).where(ReceivingAccount.user_id == user_id))
        .scalars()
        .first()
    )
    is_default = data.is_default or (has_any is None)

    if is_default:
        existing_defaults = (
            db.execute(
                select(ReceivingAccount).where(
                    ReceivingAccount.user_id == user_id,
                    ReceivingAccount.is_default == True,
                )
            )
            .scalars()
            .all()
        )
        for acc in existing_defaults:
            acc.is_default = False

    new_account = ReceivingAccount(
        user_id=user_id,
        bank_code=data.bank_code.upper(),
        bank_name=bank_info["name"],
        account_number=data.account_number,
        account_holder_name=data.account_holder_name.upper(),
        display_name=data.display_name or f"{bank_info['short_name']} - {data.account_number[-4:]}",
        linked_wallet_id=data.linked_wallet_id,
        is_default=is_default,
        is_active=True,
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return to_account_response(new_account)


def update_receiving_account(
    db: Session, user_id: uuid.UUID, account_id: uuid.UUID, data: ReceivingAccountUpdate
) -> ReceivingAccountResponse:
    acc = get_receiving_account(db, user_id, account_id)

    if data.bank_code is not None:
        bank_info = SUPPORTED_BANKS.get(data.bank_code.upper())
        if not bank_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã ngân hàng '{data.bank_code}' không được hỗ trợ trong danh sách VietQR",
            )
        acc.bank_code = data.bank_code.upper()
        acc.bank_name = bank_info["name"]

    if data.account_number is not None:
        acc.account_number = data.account_number

    if data.account_holder_name is not None:
        acc.account_holder_name = data.account_holder_name

    if data.linked_wallet_id is not None:
        wallet = db.get(Wallet, data.linked_wallet_id)
        if not wallet or wallet.owner_user_id != user_id or wallet.is_archived:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ví liên kết không hợp lệ",
            )
        acc.linked_wallet_id = data.linked_wallet_id

    if data.display_name is not None:
        acc.display_name = data.display_name

    if data.is_default is True and not acc.is_default:
        other_accs = (
            db.execute(
                select(ReceivingAccount).where(
                    ReceivingAccount.user_id == user_id,
                    ReceivingAccount.id != account_id,
                )
            )
            .scalars()
            .all()
        )
        for o in other_accs:
            o.is_default = False
        acc.is_default = True

    if data.is_active is not None:
        acc.is_active = data.is_active

    db.commit()
    db.refresh(acc)
    return to_account_response(acc)


def delete_receiving_account(
    db: Session, user_id: uuid.UUID, account_id: uuid.UUID
) -> dict:
    acc = get_receiving_account(db, user_id, account_id)
    req_count = (
        db.execute(
            select(IncomingPaymentRequest).where(
                IncomingPaymentRequest.receiving_account_id == account_id
            )
        )
        .scalars()
        .first()
    )

    if req_count:
        acc.is_active = False
        acc.is_default = False
        db.commit()
    else:
        db.delete(acc)
        db.commit()

    return {"message": "Tài khoản nhận tiền đã được xóa thành công"}


def generate_reference_code(db: Session) -> str:
    """Generate unique human-friendly reference code for payment memo."""
    for _ in range(10):
        code = "FP" + secrets.token_hex(4).upper()
        existing = (
            db.execute(
                select(IncomingPaymentRequest).where(
                    IncomingPaymentRequest.reference_code == code
                )
            )
            .scalars()
            .first()
        )
        if not existing:
            return code
    return "FP" + datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")


def create_payment_request(
    db: Session, user_id: uuid.UUID, data: IncomingPaymentRequestCreate
) -> IncomingPaymentRequestResponse:
    wallet = db.get(Wallet, data.target_wallet_id)
    if not wallet or wallet.owner_user_id != user_id or wallet.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ví nhận tiền không tồn tại hoặc đã bị lưu trữ",
        )

    bank_code = None
    bank_name = None
    account_number = None
    account_holder = None
    receiving_account_id = None

    if data.receiving_account_id:
        acc = db.get(ReceivingAccount, data.receiving_account_id)
        if not acc or acc.user_id != user_id or not acc.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tài khoản nhận tiền không hợp lệ hoặc đã ngừng kích hoạt",
            )
        bank_code = acc.bank_code
        bank_name = acc.bank_name
        account_number = acc.account_number
        account_holder = acc.account_holder_name
        receiving_account_id = acc.id
    else:
        if not wallet.bank_code or not wallet.account_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ví này chưa có thông tin ngân hàng hoặc số tài khoản. Vui lòng cập nhật ví hoặc chọn tài khoản nhận tiền.",
            )
        bank_info = SUPPORTED_BANKS.get(wallet.bank_code.upper())
        bank_code = wallet.bank_code.upper()
        bank_name = wallet.bank_name or (bank_info["name"] if bank_info else wallet.bank_code)
        account_number = wallet.account_number
        account_holder = wallet.account_holder_name or "TÀI KHOẢN"
        receiving_account_id = None

    target_category_id = data.category_id
    if target_category_id:
        category = db.get(Category, target_category_id)
        if not category or category.kind != "INCOME":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Danh mục không hợp lệ hoặc không phải loại Thu nhập (INCOME)",
            )
    else:
        default_cat = db.get(Category, DEFAULT_INCOME_CATEGORY_ID)
        if default_cat and default_cat.kind == "INCOME":
            target_category_id = DEFAULT_INCOME_CATEGORY_ID

    ref_code = generate_reference_code(db)

    if data.transfer_memo and data.transfer_memo.strip():
        memo = clean_ascii_for_vietqr(data.transfer_memo)[:25]
    else:
        memo = ref_code

    qr_payload = generate_vietqr_payload(
        bank_code=bank_code,
        account_number=account_number,
        amount=data.expected_amount,
        memo=memo,
        flexible_amount=data.allow_flexible_amount,
    )

    req = IncomingPaymentRequest(
        user_id=user_id,
        receiving_account_id=receiving_account_id,
        target_wallet_id=wallet.id,
        category_id=target_category_id,
        reference_code=ref_code,
        expected_amount=data.expected_amount,
        actual_amount=None,
        description=data.description,
        transfer_memo=memo,
        qr_payload=qr_payload,
        status="PENDING",
        bank_code_snapshot=bank_code,
        bank_name_snapshot=bank_name,
        account_number_snapshot=account_number,
        account_holder_snapshot=account_holder,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return to_request_response(req)


def list_payment_requests(
    db: Session,
    user_id: uuid.UUID,
    status_filter: Optional[str] = None,
    wallet_id: Optional[uuid.UUID] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[IncomingPaymentRequestResponse]:
    query = select(IncomingPaymentRequest).where(IncomingPaymentRequest.user_id == user_id)
    if status_filter:
        query = query.where(IncomingPaymentRequest.status == status_filter.upper())
    if wallet_id:
        query = query.where(IncomingPaymentRequest.target_wallet_id == wallet_id)

    query = (
        query.order_by(desc(IncomingPaymentRequest.created_at))
        .offset(offset)
        .limit(limit)
    )

    requests = db.execute(query).scalars().all()
    return [to_request_response(r) for r in requests]


def get_payment_request(
    db: Session, user_id: uuid.UUID, request_id: uuid.UUID
) -> IncomingPaymentRequestResponse:
    req = db.get(IncomingPaymentRequest, request_id)
    if not req or req.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu nhận tiền",
        )
    return to_request_response(req)


def cancel_payment_request(
    db: Session, user_id: uuid.UUID, request_id: uuid.UUID
) -> IncomingPaymentRequestResponse:
    req = db.get(IncomingPaymentRequest, request_id)
    if not req or req.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu nhận tiền",
        )

    if req.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Yêu cầu đã ở trạng thái '{req.status}', không thể hủy",
        )

    req.status = "CANCELLED"
    req.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return to_request_response(req)


def confirm_payment_received(
    db: Session,
    user_id: uuid.UUID,
    request_id: uuid.UUID,
    data: ConfirmPaymentReceivedRequest,
) -> IncomingPaymentRequestResponse:
    req = (
        db.execute(
            select(IncomingPaymentRequest)
            .where(
                IncomingPaymentRequest.id == request_id,
                IncomingPaymentRequest.user_id == user_id,
            )
            .with_for_update()
        )
        .scalars()
        .first()
    )

    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu nhận tiền",
        )

    if req.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Yêu cầu đã ở trạng thái '{req.status}', không thể xác nhận lại",
        )

    wallet = db.get(Wallet, req.target_wallet_id)
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ví nhận tiền không còn tồn tại",
        )

    chosen_category_id = data.category_id or req.category_id
    if not chosen_category_id:
        default_cat = db.get(Category, DEFAULT_INCOME_CATEGORY_ID)
        if default_cat and default_cat.kind == "INCOME":
            chosen_category_id = DEFAULT_INCOME_CATEGORY_ID

    if chosen_category_id:
        cat = db.get(Category, chosen_category_id)
        if not cat or cat.kind != "INCOME":
            if data.category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Danh mục thu nhập không hợp lệ",
                )
            else:
                chosen_category_id = None

    now = datetime.now(timezone.utc)
    actual = data.actual_amount

    # 1. Record transaction into wallet_transactions if actual > 0
    if actual > 0:
        tx_desc = f"Nhận tiền QR: {req.reference_code}"
        if req.description:
            tx_desc += f" - {req.description}"

        income_tx = WalletTransaction(
            owner_user_id=user_id,
            wallet_id=wallet.id,
            transaction_type="INCOME",
            amount=actual,
            category_id=chosen_category_id,
            description=tx_desc,
            transaction_date=now,
            source_type="INCOMING_PAYMENT_REQUEST",
            source_id=req.id,
        )
        db.add(income_tx)

    # 2. Update request status & actual amount
    req.status = "USER_CONFIRMED"
    req.actual_amount = actual
    req.category_id = chosen_category_id
    req.confirmed_at = now

    # 3. Check for amount discrepancy -> Create reconciliation record
    difference = actual - req.expected_amount
    if difference != 0:
        diff_type = "OVERPAYMENT" if difference > 0 else "SHORTFALL"
        recon = PaymentReconciliation(
            user_id=user_id,
            payment_request_id=req.id,
            expected_amount=req.expected_amount,
            actual_amount=actual,
            difference_amount=difference,
            difference_type=diff_type,
            status="OPEN",
            notes=data.notes,
        )
        db.add(recon)

    db.commit()
    db.refresh(req)
    return to_request_response(req)
