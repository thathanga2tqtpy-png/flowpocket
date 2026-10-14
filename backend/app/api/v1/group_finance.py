import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.group_finance import (
    CreateGroupExpenseRequest,
    VoidExpenseRequest,
    GroupExpenseResponse,
    GroupExpenseSplitResponse,
    GroupFundResponse,
    FundContributionRequest,
    FundWithdrawalRequest,
    GroupFundTransactionResponse,
    CreateSettlementRequest,
    GroupSettlementResponse,
    GroupDebtOverview,
)
from app.services.group_finance_service import GroupFinanceService

router = APIRouter()


# =============================================================================
# 1. EXPENSES & SPLITS
# =============================================================================

@router.post(
    "/{group_id}/expenses",
    response_model=GroupExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo khoản chi tiêu mới trong nhóm",
)
def create_group_expense(
    group_id: uuid.UUID,
    payload: CreateGroupExpenseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = GroupFinanceService.create_expense(
        db=db,
        group_id=group_id,
        user_id=current_user.id,
        payload=payload,
    )
    # Serialize with splits and member info
    return _serialize_expense(expense)


@router.get(
    "/{group_id}/expenses",
    response_model=List[GroupExpenseResponse],
    summary="Danh sách các khoản chi của nhóm",
)
def list_group_expenses(
    group_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expenses = GroupFinanceService.list_expenses(
        db=db,
        group_id=group_id,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )
    return [_serialize_expense(e) for e in expenses]


@router.post(
    "/{group_id}/expenses/{expense_id}/void",
    response_model=GroupExpenseResponse,
    summary="Vô hiệu hóa (Void) một khoản chi",
)
def void_group_expense(
    group_id: uuid.UUID,
    expense_id: uuid.UUID,
    payload: VoidExpenseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = GroupFinanceService.void_expense(
        db=db,
        group_id=group_id,
        expense_id=expense_id,
        user_id=current_user.id,
        payload=payload,
    )
    return _serialize_expense(expense)


def _serialize_expense(expense) -> GroupExpenseResponse:
    splits_resp = [
        GroupExpenseSplitResponse(
            id=s.id,
            member_user_id=s.member_user_id,
            member_name=s.member.display_name if s.member else None,
            member_email=s.member.email if s.member else None,
            amount_owed=s.amount_owed,
        )
        for s in expense.splits
    ]

    return GroupExpenseResponse(
        id=expense.id,
        group_id=expense.group_id,
        title=expense.title,
        total_amount=expense.total_amount,
        expense_date=expense.expense_date,
        payment_source=expense.payment_source,
        paid_by_user_id=expense.paid_by_user_id,
        paid_by_name=expense.payer.display_name if expense.payer else None,
        fund_id=expense.fund_id,
        split_method=expense.split_method,
        status=expense.status,
        created_by_user_id=expense.created_by_user_id,
        void_reason=expense.void_reason,
        created_at=expense.created_at,
        splits=splits_resp,
    )


# =============================================================================
# 2. GROUP FUNDS
# =============================================================================

@router.get(
    "/{group_id}/fund",
    response_model=GroupFundResponse,
    summary="Thông tin và số dư quỹ chung của nhóm",
)
def get_group_fund(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    GroupFinanceService.get_user_member_record(db, group_id, current_user.id)
    fund = GroupFinanceService.get_or_create_default_fund(db, group_id)
    balance = GroupFinanceService.get_fund_balance(db, fund.id)

    return GroupFundResponse(
        id=fund.id,
        group_id=fund.group_id,
        name=fund.name,
        description=fund.description,
        status=fund.status,
        balance=balance,
        created_at=fund.created_at,
    )


@router.post(
    "/{group_id}/fund/contributions",
    response_model=GroupFundTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đóng góp tiền vào quỹ chung",
)
def contribute_to_fund(
    group_id: uuid.UUID,
    payload: FundContributionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tx = GroupFinanceService.contribute_to_fund(
        db=db,
        group_id=group_id,
        user_id=current_user.id,
        payload=payload,
    )
    return GroupFundTransactionResponse(
        id=tx.id,
        fund_id=tx.fund_id,
        transaction_type=tx.transaction_type,
        amount=tx.amount,
        contributed_by_user_id=tx.contributed_by_user_id,
        contributor_name=tx.contributor.display_name if tx.contributor else current_user.display_name,
        created_by_user_id=tx.created_by_user_id,
        group_expense_id=tx.group_expense_id,
        description=tx.description,
        transaction_date=tx.transaction_date,
        created_at=tx.created_at,
    )


@router.post(
    "/{group_id}/fund/withdrawals",
    response_model=GroupFundTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Rút tiền khỏi quỹ nhóm (chỉ dành cho Owner hoặc Admin)",
)
def withdraw_from_fund(
    group_id: uuid.UUID,
    payload: FundWithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tx = GroupFinanceService.withdraw_from_fund(
        db=db,
        group_id=group_id,
        user_id=current_user.id,
        payload=payload,
    )
    return GroupFundTransactionResponse(
        id=tx.id,
        fund_id=tx.fund_id,
        transaction_type=tx.transaction_type,
        amount=tx.amount,
        contributed_by_user_id=tx.contributed_by_user_id,
        contributor_name=None,
        created_by_user_id=tx.created_by_user_id,
        group_expense_id=tx.group_expense_id,
        description=tx.description,
        transaction_date=tx.transaction_date,
        created_at=tx.created_at,
    )


@router.get(
    "/{group_id}/fund/transactions",
    response_model=List[GroupFundTransactionResponse],
    summary="Lịch sử giao dịch dòng tiền quỹ nhóm",
)
def list_fund_transactions(
    group_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txs = GroupFinanceService.list_fund_transactions(
        db=db,
        group_id=group_id,
        user_id=current_user.id,
        limit=limit,
    )
    return [
        GroupFundTransactionResponse(
            id=t.id,
            fund_id=t.fund_id,
            transaction_type=t.transaction_type,
            amount=t.amount,
            contributed_by_user_id=t.contributed_by_user_id,
            contributor_name=t.contributor.display_name if t.contributor else None,
            created_by_user_id=t.created_by_user_id,
            group_expense_id=t.group_expense_id,
            description=t.description,
            transaction_date=t.transaction_date,
            created_at=t.created_at,
        )
        for t in txs
    ]


# =============================================================================
# 3. SETTLEMENTS & DEBT MATRIX
# =============================================================================

@router.get(
    "/{group_id}/debts",
    response_model=GroupDebtOverview,
    summary="Báo cáo số dư công nợ và gợi ý thanh toán tối thiểu",
)
def get_group_debts(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return GroupFinanceService.calculate_group_debts(
        db=db,
        group_id=group_id,
        current_user_id=current_user.id,
    )


@router.post(
    "/{group_id}/settlements",
    response_model=GroupSettlementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo yêu cầu quyết toán chuyển trả tiền cho thành viên khác",
)
def create_settlement(
    group_id: uuid.UUID,
    payload: CreateSettlementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = GroupFinanceService.create_settlement(
        db=db,
        group_id=group_id,
        from_user_id=current_user.id,
        payload=payload,
    )
    return _serialize_settlement(s)


@router.get(
    "/{group_id}/settlements",
    response_model=List[GroupSettlementResponse],
    summary="Danh sách các giao dịch quyết toán trong nhóm",
)
def list_settlements(
    group_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settlements = GroupFinanceService.list_settlements(
        db=db,
        group_id=group_id,
        user_id=current_user.id,
        limit=limit,
    )
    return [_serialize_settlement(s) for s in settlements]


@router.post(
    "/{group_id}/settlements/{settlement_id}/confirm",
    response_model=GroupSettlementResponse,
    summary="Xác nhận đã nhận tiền quyết toán (chỉ người nhận)",
)
def confirm_settlement(
    group_id: uuid.UUID,
    settlement_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = GroupFinanceService.confirm_settlement(
        db=db,
        group_id=group_id,
        settlement_id=settlement_id,
        current_user_id=current_user.id,
    )
    return _serialize_settlement(s)


@router.post(
    "/{group_id}/settlements/{settlement_id}/reject",
    response_model=GroupSettlementResponse,
    summary="Từ chối quyết toán (chỉ người nhận)",
)
def reject_settlement(
    group_id: uuid.UUID,
    settlement_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = GroupFinanceService.reject_settlement(
        db=db,
        group_id=group_id,
        settlement_id=settlement_id,
        current_user_id=current_user.id,
    )
    return _serialize_settlement(s)


@router.post(
    "/{group_id}/settlements/{settlement_id}/cancel",
    response_model=GroupSettlementResponse,
    summary="Hủy bỏ quyết toán đã gửi (chỉ người tạo)",
)
def cancel_settlement(
    group_id: uuid.UUID,
    settlement_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = GroupFinanceService.cancel_settlement(
        db=db,
        group_id=group_id,
        settlement_id=settlement_id,
        current_user_id=current_user.id,
    )
    return _serialize_settlement(s)


def _serialize_settlement(s) -> GroupSettlementResponse:
    return GroupSettlementResponse(
        id=s.id,
        group_id=s.group_id,
        from_user_id=s.from_user_id,
        from_user_name=s.from_user.display_name if s.from_user else None,
        to_user_id=s.to_user_id,
        to_user_name=s.to_user.display_name if s.to_user else None,
        amount=s.amount,
        status=s.status,
        note=s.note,
        created_at=s.created_at,
        confirmed_at=s.confirmed_at,
        rejected_at=s.rejected_at,
        cancelled_at=s.cancelled_at,
    )

