import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_active_user
from app.core.csrf import verify_csrf
from app.schemas.transaction import (
    TransactionCreate,
    TransferCreate,
    TransactionResponse,
    FinancialSummary,
)
from app.services.transaction_service import (
    create_transaction,
    create_transfer,
    list_transactions,
    get_financial_summary,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=list[TransactionResponse])
def get_transactions(
    wallet_id: uuid.UUID | None = Query(None, description="Lọc theo ví"),
    category_id: uuid.UUID | None = Query(None, description="Lọc theo danh mục"),
    transaction_type: str | None = Query(None, description="Lọc theo loại giao dịch (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT...)"),
    source_type: str | None = Query(None, description="Lọc theo nguồn (PERSONAL, GROUP, GROUP_EXPENSE, GROUP_SETTLEMENT)"),
    from_date: datetime | None = Query(None, description="Từ ngày"),
    to_date: datetime | None = Query(None, description="Đến ngày"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy danh sách lịch sử giao dịch kèm bộ lọc thời gian, ví, danh mục và nguồn gốc (cá nhân/nhóm)"""
    return list_transactions(
        db=db,
        user_id=current_user.id,
        wallet_id=wallet_id,
        category_id=category_id,
        transaction_type=transaction_type,
        source_type=source_type,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def add_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Ghi nhận khoản thu nhập hoặc chi tiêu cá nhân"""
    return create_transaction(db, current_user.id, data)


@router.post("/transfer", response_model=list[TransactionResponse], status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def transfer_money(
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Chuyển tiền hai chiều nguyên tử (atomic) giữa hai ví của cùng người dùng"""
    tx_out, tx_in = create_transfer(db, current_user.id, data)
    return [tx_out, tx_in]


@router.get("/summary", response_model=FinancialSummary)
def get_summary(
    from_date: datetime | None = Query(None, description="Từ ngày"),
    to_date: datetime | None = Query(None, description="Đến ngày"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Báo cáo tổng hợp tài chính cá nhân: tổng tài sản, thu nhập, chi tiêu, dòng tiền ròng và phân bổ danh mục"""
    return get_financial_summary(
        db=db,
        user_id=current_user.id,
        from_date=from_date,
        to_date=to_date,
    )

