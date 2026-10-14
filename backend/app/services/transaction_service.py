import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status

from app.models.wallet import Wallet
from app.models.category import Category
from app.models.transaction import WalletTransaction
from app.schemas.transaction import (
    TransactionCreate,
    TransferCreate,
    TransactionResponse,
    FinancialSummary,
    CategoryExpenseBreakdown,
)
from app.services.wallet_service import (
    get_wallet_by_id,
    calculate_wallet_balance,
    get_user_wallets_with_balance,
)
from app.services.category_service import validate_category_accessible


def create_transaction(
    db: Session, user_id: uuid.UUID, data: TransactionCreate
) -> TransactionResponse:
    type_upper = data.transaction_type.upper()
    if type_upper not in ("INCOME", "EXPENSE"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại giao dịch cá nhân chỉ có thể là INCOME hoặc EXPENSE. Chuyển ví vui lòng dùng endpoint transfer.",
        )

    # 1. Validate wallet ownership
    wallet = get_wallet_by_id(db, user_id, data.wallet_id)

    # 2. Validate category if provided
    category_name = None
    if data.category_id:
        category = validate_category_accessible(
            db, user_id, data.category_id, expected_kind=type_upper
        )
        category_name = category.name

    tx_date = data.transaction_date or datetime.now(timezone.utc)

    # 3. Create ledger entry
    tx = WalletTransaction(
        owner_user_id=user_id,
        wallet_id=wallet.id,
        transaction_type=type_upper,
        amount=data.amount,
        category_id=data.category_id,
        description=data.description.strip() if data.description else None,
        transaction_date=tx_date,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    return TransactionResponse(
        id=tx.id,
        wallet_id=tx.wallet_id,
        wallet_name=wallet.name,
        transaction_type=tx.transaction_type,
        amount=tx.amount,
        category_id=tx.category_id,
        category_name=category_name,
        description=tx.description,
        transaction_date=tx.transaction_date,
        transfer_group_id=tx.transfer_group_id,
        created_at=tx.created_at,
    )


def create_transfer(
    db: Session, user_id: uuid.UUID, data: TransferCreate
) -> tuple[TransactionResponse, TransactionResponse]:
    """
    Atomic transfer between two wallets belonging to the same user.
    Creates TRANSFER_OUT and TRANSFER_IN in a single database transaction.
    """
    if data.source_wallet_id == data.destination_wallet_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ví nguồn và ví đích chuyển tiền phải khác nhau",
        )

    # Validate ownership of both wallets
    source_wallet = get_wallet_by_id(db, user_id, data.source_wallet_id)
    dest_wallet = get_wallet_by_id(db, user_id, data.destination_wallet_id)

    # Check sufficient funds in source wallet
    source_balance = calculate_wallet_balance(db, source_wallet)
    if source_balance < data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số dư ví nguồn không đủ (Số dư hiện tại: {source_balance:,} VND, cần chuyển: {data.amount:,} VND)",
        )

    transfer_gid = uuid.uuid4()
    tx_date = data.transaction_date or datetime.now(timezone.utc)
    desc = data.description.strip() if data.description else f"Chuyển tiền từ {source_wallet.name} sang {dest_wallet.name}"

    # Atomic creation of both entries
    tx_out = WalletTransaction(
        owner_user_id=user_id,
        wallet_id=source_wallet.id,
        transaction_type="TRANSFER_OUT",
        amount=data.amount,
        category_id=None,
        description=desc,
        transaction_date=tx_date,
        transfer_group_id=transfer_gid,
    )

    tx_in = WalletTransaction(
        owner_user_id=user_id,
        wallet_id=dest_wallet.id,
        transaction_type="TRANSFER_IN",
        amount=data.amount,
        category_id=None,
        description=desc,
        transaction_date=tx_date,
        transfer_group_id=transfer_gid,
    )

    db.add(tx_out)
    db.add(tx_in)
    db.commit()
    db.refresh(tx_out)
    db.refresh(tx_in)

    res_out = TransactionResponse(
        id=tx_out.id,
        wallet_id=tx_out.wallet_id,
        wallet_name=source_wallet.name,
        transaction_type=tx_out.transaction_type,
        amount=tx_out.amount,
        category_id=None,
        category_name=None,
        description=tx_out.description,
        transaction_date=tx_out.transaction_date,
        transfer_group_id=tx_out.transfer_group_id,
        created_at=tx_out.created_at,
    )

    res_in = TransactionResponse(
        id=tx_in.id,
        wallet_id=tx_in.wallet_id,
        wallet_name=dest_wallet.name,
        transaction_type=tx_in.transaction_type,
        amount=tx_in.amount,
        category_id=None,
        category_name=None,
        description=tx_in.description,
        transaction_date=tx_in.transaction_date,
        transfer_group_id=tx_in.transfer_group_id,
        created_at=tx_in.created_at,
    )

    return res_out, res_in


def list_transactions(
    db: Session,
    user_id: uuid.UUID,
    wallet_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    transaction_type: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[TransactionResponse]:
    query = (
        select(WalletTransaction, Wallet.name, Category.name)
        .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
        .outerjoin(Category, WalletTransaction.category_id == Category.id)
        .where(WalletTransaction.owner_user_id == user_id)
    )

    if wallet_id:
        query = query.where(WalletTransaction.wallet_id == wallet_id)
    if category_id:
        query = query.where(WalletTransaction.category_id == category_id)
    if transaction_type:
        query = query.where(WalletTransaction.transaction_type == transaction_type.upper())
    if from_date:
        query = query.where(WalletTransaction.transaction_date >= from_date)
    if to_date:
        query = query.where(WalletTransaction.transaction_date <= to_date)

    query = query.order_by(WalletTransaction.transaction_date.desc(), WalletTransaction.created_at.desc())
    query = query.limit(limit).offset(offset)

    rows = db.execute(query).all()

    return [
        TransactionResponse(
            id=tx.id,
            wallet_id=tx.wallet_id,
            wallet_name=w_name,
            transaction_type=tx.transaction_type,
            amount=tx.amount,
            category_id=tx.category_id,
            category_name=c_name,
            description=tx.description,
            transaction_date=tx.transaction_date,
            transfer_group_id=tx.transfer_group_id,
            created_at=tx.created_at,
        )
        for tx, w_name, c_name in rows
    ]


def get_financial_summary(
    db: Session,
    user_id: uuid.UUID,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> FinancialSummary:
    """
    Computes financial overview:
    - Total Assets: sum of balances of all user's active wallets.
    - Total Income: sum(INCOME) in range. (Excludes transfers!)
    - Total Expense: sum(EXPENSE) in range. (Excludes transfers!)
    - Net Cash Flow: Income - Expense.
    - Expense breakdown by category.
    """
    wallets_with_bal = get_user_wallets_with_balance(db, user_id)
    total_assets = sum(w.current_balance for w in wallets_with_bal)

    # Date filters for income/expense report
    filters = [WalletTransaction.owner_user_id == user_id]
    if from_date:
        filters.append(WalletTransaction.transaction_date >= from_date)
    if to_date:
        filters.append(WalletTransaction.transaction_date <= to_date)

    # 1. Total Income (strictly INCOME type)
    income_query = select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
        *filters,
        WalletTransaction.transaction_type == "INCOME",
    )
    total_income = db.execute(income_query).scalar_one()

    # 2. Total Personal Expense (strictly EXPENSE type)
    expense_query = select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
        *filters,
        WalletTransaction.transaction_type == "EXPENSE",
    )
    total_expense = db.execute(expense_query).scalar_one()

    # 3. Expense breakdown by category
    breakdown_query = (
        select(
            WalletTransaction.category_id,
            func.coalesce(Category.name, "Chưa phân loại"),
            func.sum(WalletTransaction.amount).label("cat_total"),
        )
        .outerjoin(Category, WalletTransaction.category_id == Category.id)
        .where(
            *filters,
            WalletTransaction.transaction_type == "EXPENSE",
        )
        .group_by(WalletTransaction.category_id, Category.name)
        .order_by(func.sum(WalletTransaction.amount).desc())
    )
    breakdown_rows = db.execute(breakdown_query).all()

    breakdown = []
    for cat_id, cat_name, cat_total in breakdown_rows:
        pct = (cat_total / total_expense * 100) if total_expense > 0 else 0.0
        breakdown.append(
            CategoryExpenseBreakdown(
                category_id=cat_id,
                category_name=cat_name,
                total_amount=cat_total,
                percentage=round(pct, 1),
            )
        )

    return FinancialSummary(
        total_assets=total_assets,
        total_income=total_income,
        total_expense=total_expense,
        net_cash_flow=total_income - total_expense,
        wallets=wallets_with_bal,
        expense_breakdown=breakdown,
    )

