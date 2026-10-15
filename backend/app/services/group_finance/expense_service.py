import uuid
from datetime import datetime, date, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.group import FinanceGroup
from app.models.group_member import GroupMember
from app.models.group_expense import GroupExpense, GroupExpenseSplit
from app.models.group_fund import GroupFund, GroupFundTransaction
from app.models.wallet import Wallet
from app.models.transaction import WalletTransaction
from app.schemas.group_finance import CreateGroupExpenseRequest, VoidExpenseRequest
from app.services.group_finance.constants import DEFAULT_GROUP_CATEGORY_ID, get_user_member_record
from app.services.group_finance.fund_service import get_or_create_default_fund, get_fund_balance


def calculate_splits(
    total_amount: int,
    split_method: str,
    splits_input: list,
    active_member_ids: set,
) -> List[Tuple[uuid.UUID, int]]:
    """
    Calculates and validates split distribution.
    Guarantees exact integer sum preservation without creating or losing a single VND.
    """
    member_ids = [s.member_user_id for s in splits_input]
    if len(member_ids) != len(set(member_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Một thành viên không được xuất hiện nhiều lần trong cùng khoản chi.",
        )

    for mid in member_ids:
        if mid not in active_member_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Thành viên {mid} không thuộc nhóm chi tiêu này.",
            )

    count = len(splits_input)
    if count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phải có ít nhất một thành viên chịu phần chia chi phí.",
        )

    result_splits: List[Tuple[uuid.UUID, int]] = []

    if split_method == "EQUAL":
        base = total_amount // count
        remainder = total_amount % count
        for i, split in enumerate(splits_input):
            amount = base + 1 if i < remainder else base
            result_splits.append((split.member_user_id, amount))
    elif split_method == "CUSTOM":
        calculated_sum = 0
        for split in splits_input:
            if split.amount is None or split.amount <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Với chia tùy chỉnh, số tiền mỗi thành viên chịu phải lớn hơn 0.",
                )
            calculated_sum += split.amount
            result_splits.append((split.member_user_id, split.amount))

        if calculated_sum != total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tổng các phần chia ({calculated_sum:,} đ) không khớp với tổng khoản chi ({total_amount:,} đ).",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phương thức chia {split_method} không được hỗ trợ.",
        )

    return result_splits


def create_expense(
    db: Session,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: CreateGroupExpenseRequest,
) -> GroupExpense:
    # 1. Verify user membership
    get_user_member_record(db, group_id, user_id)

    # 2. Fetch all active members of the group
    active_members = db.query(GroupMember.user_id).filter(
        GroupMember.group_id == group_id,
        GroupMember.status == "ACTIVE",
    ).all()
    active_member_ids = {m[0] for m in active_members}

    # 3. Validate payment source and related entities
    paid_by_user_id = None
    fund_id = None

    if payload.payment_source == "MEMBER":
        if not payload.paid_by_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khi thành viên trả tiền, cần chỉ định paid_by_user_id.",
            )
        if payload.paid_by_user_id not in active_member_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Người trả tiền không phải là thành viên hoạt động của nhóm.",
            )
        paid_by_user_id = payload.paid_by_user_id
    elif payload.payment_source == "FUND":
        target_fund = None
        if payload.fund_id:
            target_fund = db.query(GroupFund).filter(
                GroupFund.id == payload.fund_id,
                GroupFund.group_id == group_id,
                GroupFund.status == "ACTIVE",
            ).first()
        else:
            target_fund = get_or_create_default_fund(db, group_id)

        if not target_fund:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy quỹ hợp lệ của nhóm.",
            )

        current_balance = get_fund_balance(db, target_fund.id)
        if current_balance < payload.total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số dư quỹ không đủ (Hiện có: {current_balance:,} đ, Cần chi: {payload.total_amount:,} đ).",
            )

        fund_id = target_fund.id
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nguồn thanh toán chỉ có thể là MEMBER hoặc FUND.",
        )

    # 4. Calculate and validate splits
    validated_splits = calculate_splits(
        total_amount=payload.total_amount,
        split_method=payload.split_method,
        splits_input=payload.splits,
        active_member_ids=active_member_ids,
    )

    expense_date = payload.expense_date or date.today()
    group = db.query(FinanceGroup).filter(FinanceGroup.id == group_id).first()
    group_name = group.name if group else "Nhóm"
    chosen_category_id = payload.category_id or DEFAULT_GROUP_CATEGORY_ID

    # 5. Create GroupExpense record
    expense = GroupExpense(
        group_id=group_id,
        title=payload.title,
        total_amount=payload.total_amount,
        expense_date=expense_date,
        payment_source=payload.payment_source,
        paid_by_user_id=paid_by_user_id,
        fund_id=fund_id,
        category_id=chosen_category_id,
        split_method=payload.split_method,
        status="POSTED",
        created_by_user_id=user_id,
    )
    db.add(expense)
    db.flush()

    # 6. Create GroupExpenseSplit records
    for member_id, amount_owed in validated_splits:
        split_record = GroupExpenseSplit(
            expense_id=expense.id,
            member_user_id=member_id,
            amount_owed=amount_owed,
        )
        db.add(split_record)

    # 7. If paid by FUND, record GroupFundTransaction atomically
    if payload.payment_source == "FUND" and fund_id:
        fund_tx = GroupFundTransaction(
            fund_id=fund_id,
            transaction_type="EXPENSE",
            amount=payload.total_amount,
            created_by_user_id=user_id,
            group_expense_id=expense.id,
            description=f"[{group_name}] Chi phí quỹ: {payload.title}",
            transaction_date=expense_date,
        )
        db.add(fund_tx)

    # 8. If paid by MEMBER and payer_wallet_id is provided, deduct from personal wallet atomically
    if payload.payment_source == "MEMBER" and payload.payer_wallet_id and paid_by_user_id:
        wallet = db.query(Wallet).filter(
            Wallet.id == payload.payer_wallet_id,
            Wallet.owner_user_id == paid_by_user_id,
            Wallet.is_archived.is_(False),
        ).first()
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ví cá nhân được chọn không hợp lệ hoặc đã bị lưu trữ.",
            )

        tx_dt = datetime.combine(expense_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        wallet_tx = WalletTransaction(
            owner_user_id=paid_by_user_id,
            wallet_id=wallet.id,
            transaction_type="EXPENSE",
            amount=payload.total_amount,
            category_id=chosen_category_id,
            description=f"[{group_name}] Chi tiêu: {payload.title}",
            transaction_date=tx_dt,
            source_type="GROUP_EXPENSE",
            source_id=expense.id,
        )
        db.add(wallet_tx)

    db.commit()
    db.refresh(expense)
    return expense


def void_expense(
    db: Session,
    group_id: uuid.UUID,
    expense_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: VoidExpenseRequest,
) -> GroupExpense:
    membership = get_user_member_record(db, group_id, user_id)

    expense = db.query(GroupExpense).filter(
        GroupExpense.id == expense_id,
        GroupExpense.group_id == group_id,
    ).first()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khoản chi không tồn tại trong nhóm này.",
        )

    if expense.status == "VOID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoản chi này đã bị vô hiệu hóa trước đó.",
        )

    is_creator = expense.created_by_user_id == user_id
    is_manager = membership.role in ["OWNER", "ADMIN"]
    if not (is_creator or is_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền vô hiệu hóa khoản chi này.",
        )

    expense.status = "VOID"
    expense.void_reason = payload.reason
    expense.voided_at = datetime.utcnow()

    # If it was paid from FUND, refund atomically
    if expense.payment_source == "FUND" and expense.fund_id:
        refund_tx = GroupFundTransaction(
            fund_id=expense.fund_id,
            transaction_type="ADJUSTMENT_IN",
            amount=expense.total_amount,
            created_by_user_id=user_id,
            description=f"Hoàn tiền do hủy khoản chi: {expense.title} (Lý do: {payload.reason})",
            transaction_date=date.today(),
        )
        db.add(refund_tx)

    # If it was paid from a personal wallet, refund to personal wallet atomically
    linked_wallet_tx = db.query(WalletTransaction).filter(
        WalletTransaction.source_type == "GROUP_EXPENSE",
        WalletTransaction.source_id == expense.id,
        WalletTransaction.transaction_type == "EXPENSE",
    ).first()
    if linked_wallet_tx:
        refund_wallet_tx = WalletTransaction(
            owner_user_id=linked_wallet_tx.owner_user_id,
            wallet_id=linked_wallet_tx.wallet_id,
            transaction_type="INCOME",
            amount=linked_wallet_tx.amount,
            category_id=linked_wallet_tx.category_id,
            description=f"Hoàn tiền do hủy chi tiêu nhóm: {expense.title} (Lý do: {payload.reason})",
            transaction_date=datetime.now(timezone.utc),
            source_type="GROUP_EXPENSE_REFUND",
            source_id=expense.id,
        )
        db.add(refund_wallet_tx)

    db.commit()
    db.refresh(expense)
    return expense


def list_expenses(
    db: Session,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    payment_source: Optional[str] = None,
    paid_by_user_id: Optional[uuid.UUID] = None,
    member_user_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[GroupExpense]:
    get_user_member_record(db, group_id, user_id)

    query = db.query(GroupExpense).filter(GroupExpense.group_id == group_id)

    if from_date:
        query = query.filter(GroupExpense.expense_date >= from_date)
    if to_date:
        query = query.filter(GroupExpense.expense_date <= to_date)
    if payment_source:
        query = query.filter(GroupExpense.payment_source == payment_source.upper())
    if paid_by_user_id:
        query = query.filter(GroupExpense.paid_by_user_id == paid_by_user_id)
    if member_user_id:
        query = query.filter(GroupExpense.splits.any(GroupExpenseSplit.member_user_id == member_user_id))
    if status:
        query = query.filter(GroupExpense.status == status.upper())

    return (
        query.order_by(GroupExpense.expense_date.desc(), GroupExpense.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

