import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, func, case
from fastapi import HTTPException, status

from app.models.wallet import Wallet
from app.models.transaction import WalletTransaction
from app.schemas.wallet import WalletCreate, WalletUpdate, WalletWithBalanceResponse


def calculate_wallet_balance(db: Session, wallet: Wallet) -> int:
    """
    Calculate current balance strictly from opening balance and ledger records:
    Balance = opening_balance + sum(INFLOW) - sum(OUTFLOW)
    """
    inflow_types = ("INCOME", "TRANSFER_IN", "GROUP_SETTLEMENT_RECEIVED", "ADJUSTMENT_IN")
    outflow_types = ("EXPENSE", "TRANSFER_OUT", "GROUP_EXPENSE_PAYMENT", "FUND_CONTRIBUTION", "GROUP_SETTLEMENT_PAID", "ADJUSTMENT_OUT")

    ledger_diff = db.execute(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (WalletTransaction.transaction_type.in_(inflow_types), WalletTransaction.amount),
                        (WalletTransaction.transaction_type.in_(outflow_types), -WalletTransaction.amount),
                        else_=0,
                    )
                ),
                0,
            )
        ).where(WalletTransaction.wallet_id == wallet.id)
    ).scalar_one()

    return wallet.opening_balance + ledger_diff


def create_wallet(db: Session, user_id: uuid.UUID, data: WalletCreate) -> Wallet:
    wallet = Wallet(
        owner_user_id=user_id,
        name=data.name.strip(),
        wallet_type=data.wallet_type.upper(),
        currency=data.currency.upper(),
        opening_balance=data.opening_balance,
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def get_wallet_by_id(db: Session, user_id: uuid.UUID, wallet_id: uuid.UUID) -> Wallet:
    wallet = db.execute(
        select(Wallet).where(
            Wallet.id == wallet_id,
            Wallet.owner_user_id == user_id,
        )
    ).scalar_one_or_none()

    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ví không tồn tại hoặc bạn không có quyền truy cập",
        )
    return wallet


def get_user_wallets_with_balance(
    db: Session, user_id: uuid.UUID, include_archived: bool = False
) -> list[WalletWithBalanceResponse]:
    query = select(Wallet).where(Wallet.owner_user_id == user_id)
    if not include_archived:
        query = query.where(Wallet.is_archived.is_(False))
    query = query.order_by(Wallet.created_at.asc())

    wallets = db.execute(query).scalars().all()
    results = []
    for w in wallets:
        current_bal = calculate_wallet_balance(db, w)
        results.append(
            WalletWithBalanceResponse(
                id=w.id,
                owner_user_id=w.owner_user_id,
                name=w.name,
                wallet_type=w.wallet_type,
                currency=w.currency,
                opening_balance=w.opening_balance,
                is_archived=w.is_archived,
                created_at=w.created_at,
                current_balance=current_bal,
            )
        )
    return results


def update_wallet(
    db: Session, user_id: uuid.UUID, wallet_id: uuid.UUID, data: WalletUpdate
) -> Wallet:
    wallet = get_wallet_by_id(db, user_id, wallet_id)
    if data.name is not None:
        wallet.name = data.name.strip()
    if data.wallet_type is not None:
        wallet.wallet_type = data.wallet_type.upper()
    if data.is_archived is not None:
        wallet.is_archived = data.is_archived

    db.commit()
    db.refresh(wallet)
    return wallet

