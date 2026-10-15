import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from fastapi import HTTPException, status

from app.models.wallet import Wallet
from app.models.category import Category
from app.models.transaction import WalletTransaction
from app.models.outgoing_payment_request import OutgoingPaymentRequest
from app.schemas.qr_payment import (
    OutgoingPaymentRequestCreate,
    OutgoingPaymentRequestResponse,
    OutgoingPaymentRequestListResponse,
    ConfirmOutgoingPaymentRequest,
)
from app.services.qr_payments.constants import (
    DEFAULT_EXPENSE_CATEGORY_ID,
    to_outgoing_response,
)


def create_outgoing_payment(
    db: Session, user_id: uuid.UUID, data: OutgoingPaymentRequestCreate
) -> OutgoingPaymentRequestResponse:
    wallet = db.get(Wallet, data.wallet_id)
    if not wallet or wallet.owner_user_id != user_id or wallet.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ví được chọn không hợp lệ hoặc đã bị lưu trữ",
        )

    target_category_id = data.category_id
    cat_name = None
    if target_category_id:
        cat = db.get(Category, target_category_id)
        if not cat or cat.kind != "EXPENSE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Danh mục chi tiêu không hợp lệ",
            )
        cat_name = cat.name
    else:
        default_cat = db.get(Category, DEFAULT_EXPENSE_CATEGORY_ID)
        if default_cat and default_cat.kind == "EXPENSE":
            target_category_id = DEFAULT_EXPENSE_CATEGORY_ID
            cat_name = default_cat.name

    out_req = OutgoingPaymentRequest(
        owner_user_id=user_id,
        wallet_id=wallet.id,
        category_id=target_category_id,
        amount=data.amount,
        description=data.description,
        bank_code=data.bank_code,
        bank_name=data.bank_name,
        account_number=data.account_number,
        account_holder_name=data.account_holder_name,
        qr_payload=data.qr_payload,
        status="PENDING",
    )
    db.add(out_req)
    db.commit()
    db.refresh(out_req)

    return to_outgoing_response(
        out_req, wallet_name=wallet.name, category_name=cat_name
    )


create_outgoing_request = create_outgoing_payment


def list_outgoing_requests(
    db: Session,
    user_id: uuid.UUID,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> OutgoingPaymentRequestListResponse:
    query = (
        select(
            OutgoingPaymentRequest,
            Wallet.name.label("wallet_name"),
            Category.name.label("category_name"),
        )
        .join(Wallet, OutgoingPaymentRequest.wallet_id == Wallet.id)
        .outerjoin(Category, OutgoingPaymentRequest.category_id == Category.id)
        .where(OutgoingPaymentRequest.owner_user_id == user_id)
    )
    if status_filter:
        query = query.where(OutgoingPaymentRequest.status == status_filter.upper())

    rows = db.execute(
        query.order_by(desc(OutgoingPaymentRequest.created_at))
        .offset(offset)
        .limit(limit)
    ).all()

    pending_sum_query = (
        select(func.coalesce(func.sum(OutgoingPaymentRequest.amount), 0))
        .where(
            OutgoingPaymentRequest.owner_user_id == user_id,
            OutgoingPaymentRequest.status == "PENDING",
        )
    )
    total_pending_amount = db.execute(pending_sum_query).scalar_one()

    items = [
        to_outgoing_response(
            req, wallet_name=w_name, category_name=c_name
        )
        for req, w_name, c_name in rows
    ]

    return OutgoingPaymentRequestListResponse(
        items=items,
        total=len(items),
        total_pending_amount=total_pending_amount,
    )


def confirm_outgoing_request(
    db: Session,
    user_id: uuid.UUID,
    request_id: uuid.UUID,
    data: Optional[ConfirmOutgoingPaymentRequest] = None,
) -> OutgoingPaymentRequestResponse:
    req = db.get(OutgoingPaymentRequest, request_id)
    if not req or req.owner_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu chi tiền",
        )

    if req.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Khoản chi này đã ở trạng thái '{req.status}', không thể xác nhận lại",
        )

    target_wallet_id = data.wallet_id if (data and data.wallet_id) else req.wallet_id
    wallet = db.get(Wallet, target_wallet_id)
    if not wallet or wallet.owner_user_id != user_id or wallet.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ví chi tiền không hợp lệ hoặc đã bị lưu trữ",
        )

    target_category_id = data.category_id if (data and data.category_id) else req.category_id
    cat_name = None
    if target_category_id:
        cat = db.get(Category, target_category_id)
        if not cat or cat.kind != "EXPENSE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Danh mục chi tiêu không hợp lệ",
            )
        cat_name = cat.name
    else:
        default_cat = db.get(Category, DEFAULT_EXPENSE_CATEGORY_ID)
        if default_cat and default_cat.kind == "EXPENSE":
            target_category_id = DEFAULT_EXPENSE_CATEGORY_ID
            cat_name = default_cat.name

    final_amount = data.actual_amount if (data and data.actual_amount) else req.amount
    now = datetime.now(timezone.utc)

    tx_desc = req.description or f"Chi chuyển khoản QR: {req.bank_name or req.bank_code or 'VietQR'}"
    expense_tx = WalletTransaction(
        owner_user_id=user_id,
        wallet_id=wallet.id,
        transaction_type="EXPENSE",
        amount=final_amount,
        category_id=target_category_id,
        description=tx_desc,
        transaction_date=now,
        source_type="OUTGOING_PAYMENT_REQUEST",
        source_id=req.id,
    )
    db.add(expense_tx)
    db.flush()

    req.status = "CONFIRMED"
    req.amount = final_amount
    req.wallet_id = wallet.id
    req.category_id = target_category_id
    req.confirmed_at = now
    req.wallet_transaction_id = expense_tx.id

    db.commit()
    db.refresh(req)

    return to_outgoing_response(
        req, wallet_name=wallet.name, category_name=cat_name
    )


def confirm_all_outgoing_requests(
    db: Session, user_id: uuid.UUID
) -> List[OutgoingPaymentRequestResponse]:
    query = select(OutgoingPaymentRequest).where(
        OutgoingPaymentRequest.owner_user_id == user_id,
        OutgoingPaymentRequest.status == "PENDING",
    )
    pending_list = db.execute(query).scalars().all()
    if not pending_list:
        return []

    now = datetime.now(timezone.utc)
    results = []

    for req in pending_list:
        wallet = db.get(Wallet, req.wallet_id)
        if not wallet or wallet.is_archived:
            continue

        resolved_cat_id = req.category_id or DEFAULT_EXPENSE_CATEGORY_ID
        tx_desc = req.description or f"Chi chuyển khoản QR: {req.bank_name or req.bank_code or 'VietQR'}"
        expense_tx = WalletTransaction(
            owner_user_id=user_id,
            wallet_id=wallet.id,
            transaction_type="EXPENSE",
            amount=req.amount,
            category_id=resolved_cat_id,
            description=tx_desc,
            transaction_date=now,
            source_type="OUTGOING_PAYMENT_REQUEST",
            source_id=req.id,
        )
        db.add(expense_tx)
        db.flush()

        req.status = "CONFIRMED"
        req.confirmed_at = now
        req.wallet_transaction_id = expense_tx.id
        results.append(req)

    db.commit()
    for r in results:
        db.refresh(r)

    return [to_outgoing_response(r) for r in results]


def cancel_outgoing_request(
    db: Session, user_id: uuid.UUID, request_id: uuid.UUID
) -> OutgoingPaymentRequestResponse:
    req = db.get(OutgoingPaymentRequest, request_id)
    if not req or req.owner_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu chi tiền",
        )

    if req.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Khoản chi này đã ở trạng thái '{req.status}', không thể hủy",
        )

    req.status = "CANCELLED"
    db.commit()
    db.refresh(req)
    return to_outgoing_response(req)
