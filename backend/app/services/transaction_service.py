import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, case
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


DEFAULT_GROUP_CATEGORY_ID = uuid.UUID("11111111-1111-1111-1111-111111111108")


def list_transactions(
    db: Session,
    user_id: uuid.UUID,
    wallet_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    transaction_type: str | None = None,
    source_type: str | None = None,
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
    if source_type:
        if source_type.upper() == "PERSONAL":
            query = query.where(WalletTransaction.source_type.is_(None))
        elif source_type.upper() == "GROUP":
            query = query.where(WalletTransaction.source_type.in_(["GROUP_EXPENSE", "GROUP_SETTLEMENT", "GROUP_EXPENSE_REFUND"]))
        else:
            query = query.where(WalletTransaction.source_type == source_type.upper())
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
            source_type=tx.source_type,
            source_id=tx.source_id,
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
    - Total Net Expense: Personal Expense + (Group Expense Paid - Group Settlement Received) + Group Settlement Paid.
    - Net Cash Flow: Income - Net Expense.
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

    # 2. Total Gross Personal Expense (strictly EXPENSE type)
    gross_expense_query = select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
        *filters,
        WalletTransaction.transaction_type == "EXPENSE",
    )
    gross_expense = db.execute(gross_expense_query).scalar_one()

    # 3. Group settlements: Paid (your share when paying debt) and Received (reimbursements from friends)
    settlement_paid_query = select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
        *filters,
        WalletTransaction.transaction_type == "GROUP_SETTLEMENT_PAID",
    )
    settlement_paid = db.execute(settlement_paid_query).scalar_one()

    settlement_received_query = select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
        *filters,
        WalletTransaction.transaction_type == "GROUP_SETTLEMENT_RECEIVED",
    )
    settlement_received = db.execute(settlement_received_query).scalar_one()

    # 4. Group fund contributions: Contributed (money deposited to group fund) and Withdrawn (money refunded from fund)
    fund_contributed_query = select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
        *filters,
        WalletTransaction.transaction_type == "FUND_CONTRIBUTION",
    )
    fund_contributed = db.execute(fund_contributed_query).scalar_one()

    fund_withdrawn_query = select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
        *filters,
        WalletTransaction.transaction_type == "FUND_WITHDRAWAL",
    )
    fund_withdrawn = db.execute(fund_withdrawn_query).scalar_one()

    net_fund_contribution = max(0, fund_contributed - fund_withdrawn)

    # Net Expense = Gross Expense + Settlement Paid (your share of group debt) - Settlement Received (reimbursements) + Net Fund Contribution
    total_expense = max(0, gross_expense + settlement_paid - settlement_received + net_fund_contribution)

    # 5. Expense breakdown by category
    category_name_expr = func.coalesce(
        Category.name,
        case(
            (WalletTransaction.source_type == "GROUP_EXPENSE", "Chi tiêu nhóm"),
            else_="Chi tiêu khác",
        ),
    )
    breakdown_query = (
        select(
            WalletTransaction.category_id,
            category_name_expr.label("cat_name"),
            func.sum(WalletTransaction.amount).label("cat_total"),
        )
        .outerjoin(Category, WalletTransaction.category_id == Category.id)
        .where(
            *filters,
            WalletTransaction.transaction_type == "EXPENSE",
        )
        .group_by(
            WalletTransaction.category_id,
            Category.name,
            WalletTransaction.source_type,
        )
        .order_by(func.sum(WalletTransaction.amount).desc())
    )
    breakdown_rows = db.execute(breakdown_query).all()

    breakdown_dict = {}
    for cat_id, cat_name, cat_total in breakdown_rows:
        if cat_id in breakdown_dict:
            breakdown_dict[cat_id]["total"] += int(cat_total)
        else:
            breakdown_dict[cat_id] = {
                "name": cat_name,
                "total": int(cat_total),
            }

    # Adjust group expense category for reimbursements / settlements
    group_cat_id = DEFAULT_GROUP_CATEGORY_ID
    if group_cat_id in breakdown_dict:
        breakdown_dict[group_cat_id]["total"] = max(
            0,
            breakdown_dict[group_cat_id]["total"] + settlement_paid - settlement_received,
        )
    elif (settlement_paid - settlement_received) > 0:
        breakdown_dict[group_cat_id] = {
            "name": "Chi tiêu nhóm",
            "total": settlement_paid - settlement_received,
        }

    # Add Group Fund Contribution into category breakdown
    if net_fund_contribution > 0:
        fund_cat_id = uuid.UUID("00000000-0000-0000-0000-000000001109")
        breakdown_dict[fund_cat_id] = {
            "name": "Đóng góp quỹ nhóm",
            "total": net_fund_contribution,
        }

    breakdown = []
    for cat_id, item in breakdown_dict.items():
        if item["total"] > 0:
            pct = (item["total"] / total_expense * 100) if total_expense > 0 else 0.0
            breakdown.append(
                CategoryExpenseBreakdown(
                    category_id=cat_id,
                    category_name=item["name"],
                    total_amount=item["total"],
                    percentage=round(pct, 1),
                )
            )

    breakdown.sort(key=lambda x: x.total_amount, reverse=True)

    # 6. Income breakdown by category
    income_breakdown_query = (
        select(
            WalletTransaction.category_id,
            func.coalesce(Category.name, "Thu nhập khác"),
            func.sum(WalletTransaction.amount).label("cat_total"),
        )
        .outerjoin(Category, WalletTransaction.category_id == Category.id)
        .where(
            *filters,
            WalletTransaction.transaction_type == "INCOME",
        )
        .group_by(WalletTransaction.category_id, Category.name)
        .order_by(func.sum(WalletTransaction.amount).desc())
    )
    income_breakdown_rows = db.execute(income_breakdown_query).all()

    income_breakdown = []
    for cat_id, cat_name, cat_total in income_breakdown_rows:
        tot = int(cat_total)
        if tot > 0:
            pct = (tot / total_income * 100) if total_income > 0 else 0.0
            income_breakdown.append(
                CategoryExpenseBreakdown(
                    category_id=cat_id,
                    category_name=cat_name,
                    total_amount=tot,
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
        income_breakdown=income_breakdown,
    )

