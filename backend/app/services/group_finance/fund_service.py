import uuid
from datetime import datetime, date, timezone
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.group_fund import GroupFund, GroupFundTransaction
from app.models.wallet import Wallet
from app.models.transaction import WalletTransaction
from app.schemas.group_finance import FundContributionRequest, FundWithdrawalRequest
from app.services.group_finance.constants import get_user_member_record


def get_or_create_default_fund(db: Session, group_id: uuid.UUID) -> GroupFund:
    fund = db.query(GroupFund).filter(
        GroupFund.group_id == group_id,
        GroupFund.status == "ACTIVE",
    ).first()

    if not fund:
        fund = GroupFund(
            group_id=group_id,
            name="Quỹ chung",
            description="Quỹ chi tiêu chung mặc định của nhóm",
            status="ACTIVE",
        )
        db.add(fund)
        db.commit()
        db.refresh(fund)
    return fund


def get_fund_balance(db: Session, fund_id: uuid.UUID) -> int:
    txs = db.query(
        GroupFundTransaction.transaction_type,
        func.coalesce(func.sum(GroupFundTransaction.amount), 0).label("total"),
    ).filter(
        GroupFundTransaction.fund_id == fund_id,
    ).group_by(GroupFundTransaction.transaction_type).all()

    type_sums = {t: amount for t, amount in txs}
    inflow = type_sums.get("CONTRIBUTION", 0) + type_sums.get("ADJUSTMENT_IN", 0)
    outflow = type_sums.get("EXPENSE", 0) + type_sums.get("WITHDRAWAL", 0) + type_sums.get("ADJUSTMENT_OUT", 0)
    return int(inflow - outflow)


def contribute_to_fund(
    db: Session,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: FundContributionRequest,
) -> GroupFundTransaction:
    get_user_member_record(db, group_id, user_id)
    fund = get_or_create_default_fund(db, group_id)

    tx = GroupFundTransaction(
        fund_id=fund.id,
        transaction_type="CONTRIBUTION",
        amount=payload.amount,
        contributed_by_user_id=user_id,
        created_by_user_id=user_id,
        description=payload.description or "Đóng góp quỹ nhóm",
        transaction_date=payload.transaction_date or date.today(),
    )
    db.add(tx)
    db.flush()

    # If payer_wallet_id is provided, deduct from personal wallet atomically
    if payload.payer_wallet_id:
        payer_wallet = db.query(Wallet).filter(
            Wallet.id == payload.payer_wallet_id,
            Wallet.owner_user_id == user_id,
            Wallet.is_archived.is_(False),
        ).first()
        if not payer_wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ví cá nhân được chọn không hợp lệ hoặc đã bị lưu trữ.",
            )

        wallet_tx = WalletTransaction(
            owner_user_id=user_id,
            wallet_id=payer_wallet.id,
            transaction_type="FUND_CONTRIBUTION",
            amount=payload.amount,
            description=f"Đóng góp quỹ nhóm: {fund.name}",
            transaction_date=datetime.now(timezone.utc),
            source_type="GROUP_FUND",
            source_id=tx.id,
        )
        db.add(wallet_tx)

    db.commit()
    db.refresh(tx)
    return tx


def withdraw_from_fund(
    db: Session,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: FundWithdrawalRequest,
) -> GroupFundTransaction:
    membership = get_user_member_record(db, group_id, user_id)
    if membership.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Trưởng nhóm hoặc Quản trị viên mới có quyền rút tiền từ quỹ.",
        )

    fund = get_or_create_default_fund(db, group_id)
    balance = get_fund_balance(db, fund.id)
    if balance < payload.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số dư quỹ không đủ để rút (Hiện có: {balance:,} đ, Yêu cầu: {payload.amount:,} đ).",
        )

    tx = GroupFundTransaction(
        fund_id=fund.id,
        transaction_type="WITHDRAWAL",
        amount=payload.amount,
        created_by_user_id=user_id,
        description=f"Rút quỹ: {payload.reason}",
        transaction_date=payload.transaction_date or date.today(),
    )
    db.add(tx)
    db.flush()

    # If recipient_wallet_id provided, credit personal wallet atomically
    if payload.recipient_wallet_id:
        recip_wallet = db.query(Wallet).filter(
            Wallet.id == payload.recipient_wallet_id,
            Wallet.owner_user_id == user_id,
            Wallet.is_archived.is_(False),
        ).first()
        if not recip_wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ví cá nhân nhận tiền không hợp lệ hoặc đã bị lưu trữ.",
            )

        wallet_tx = WalletTransaction(
            owner_user_id=user_id,
            wallet_id=recip_wallet.id,
            transaction_type="FUND_WITHDRAWAL",
            amount=payload.amount,
            description=f"Rút tiền từ quỹ nhóm: {fund.name}",
            transaction_date=datetime.now(timezone.utc),
            source_type="GROUP_FUND",
            source_id=tx.id,
        )
        db.add(wallet_tx)

    db.commit()
    db.refresh(tx)
    return tx


def list_fund_transactions(
    db: Session,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    limit: int = 50,
) -> List[GroupFundTransaction]:
    get_user_member_record(db, group_id, user_id)
    fund = get_or_create_default_fund(db, group_id)

    return (
        db.query(GroupFundTransaction)
        .filter(GroupFundTransaction.fund_id == fund.id)
        .order_by(GroupFundTransaction.transaction_date.desc(), GroupFundTransaction.created_at.desc())
        .limit(limit)
        .all()
    )

