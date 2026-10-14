import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_active_user
from app.core.csrf import verify_csrf
from app.schemas.wallet import (
    WalletCreate,
    WalletUpdate,
    WalletResponse,
    WalletWithBalanceResponse,
)
from app.services.wallet_service import (
    create_wallet,
    get_user_wallets_with_balance,
    get_wallet_by_id,
    calculate_wallet_balance,
    update_wallet,
)

router = APIRouter(prefix="/wallets", tags=["Wallets"])


@router.get("", response_model=list[WalletWithBalanceResponse])
def list_wallets(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy danh sách các ví của người dùng kèm số dư thực tế"""
    return get_user_wallets_with_balance(db, current_user.id, include_archived=include_archived)


@router.post("", response_model=WalletResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def create_new_wallet(
    data: WalletCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Tạo mới một ví tài chính (Tiền mặt, Ngân hàng, Ví điện tử...)"""
    wallet = create_wallet(db, current_user.id, data)
    return WalletResponse.model_validate(wallet)


@router.get("/{wallet_id}", response_model=WalletWithBalanceResponse)
def get_wallet_detail(
    wallet_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Xem chi tiết một ví và số dư hiện tại"""
    wallet = get_wallet_by_id(db, current_user.id, wallet_id)
    balance = calculate_wallet_balance(db, wallet)
    return WalletWithBalanceResponse(
        id=wallet.id,
        owner_user_id=wallet.owner_user_id,
        name=wallet.name,
        wallet_type=wallet.wallet_type,
        currency=wallet.currency,
        opening_balance=wallet.opening_balance,
        is_archived=wallet.is_archived,
        created_at=wallet.created_at,
        current_balance=balance,
    )


@router.patch("/{wallet_id}", response_model=WalletResponse, dependencies=[Depends(verify_csrf)])
def update_existing_wallet(
    wallet_id: uuid.UUID,
    data: WalletUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cập nhật thông tin ví hoặc lưu trữ/ẩn ví"""
    wallet = update_wallet(db, current_user.id, wallet_id, data)
    return WalletResponse.model_validate(wallet)

