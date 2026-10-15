import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.group import FinanceGroup
from app.models.group_settlement import GroupSettlement
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import WalletTransaction
from app.schemas.group_finance import CreateSettlementRequest, ConfirmSettlementRequest
from app.services.group_finance.constants import DEFAULT_GROUP_CATEGORY_ID, get_user_member_record


def create_settlement(
    db: Session,
    group_id: uuid.UUID,
    from_user_id: uuid.UUID,
    payload: CreateSettlementRequest,
) -> GroupSettlement:
    get_user_member_record(db, group_id, from_user_id)

    if from_user_id == payload.to_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo quyết toán cho chính bản thân mình.",
        )

    get_user_member_record(db, group_id, payload.to_user_id)

    settlement = GroupSettlement(
        group_id=group_id,
        from_user_id=from_user_id,
        to_user_id=payload.to_user_id,
        amount=payload.amount,
        status="PENDING",
        note=payload.note,
    )
    db.add(settlement)
    db.flush()

    # If payer_wallet_id provided, deduct from personal wallet atomically
    if payload.payer_wallet_id:
        payer_wallet = db.query(Wallet).filter(
            Wallet.id == payload.payer_wallet_id,
            Wallet.owner_user_id == from_user_id,
            Wallet.is_archived.is_(False),
        ).first()
        if not payer_wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ví cá nhân được chọn không hợp lệ hoặc đã bị lưu trữ.",
            )

        to_user = db.query(User).filter(User.id == payload.to_user_id).first()
        to_name = to_user.display_name or to_user.email if to_user else "thành viên"

        group = db.query(FinanceGroup).filter(FinanceGroup.id == group_id).first()
        group_name = group.name if group else "Nhóm"

        wallet_tx = WalletTransaction(
            owner_user_id=from_user_id,
            wallet_id=payer_wallet.id,
            transaction_type="GROUP_SETTLEMENT_PAID",
            amount=payload.amount,
            category_id=DEFAULT_GROUP_CATEGORY_ID,
            description=f"[{group_name}] Quyết toán trả nợ cho {to_name}",
            transaction_date=datetime.now(timezone.utc),
            source_type="GROUP_SETTLEMENT",
            source_id=settlement.id,
        )
        db.add(wallet_tx)

    db.commit()
    db.refresh(settlement)
    return settlement


def confirm_settlement(
    db: Session,
    group_id: uuid.UUID,
    settlement_id: uuid.UUID,
    current_user_id: uuid.UUID,
    payload: Optional[ConfirmSettlementRequest] = None,
) -> GroupSettlement:
    settlement = db.query(GroupSettlement).filter(
        GroupSettlement.id == settlement_id,
        GroupSettlement.group_id == group_id,
    ).first()

    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khoản quyết toán không tồn tại.",
        )

    if settlement.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Khoản quyết toán đang ở trạng thái {settlement.status}, không thể xác nhận.",
        )

    # STRICT INVARIANT: Only the recipient (to_user_id) can confirm!
    if settlement.to_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ người nhận tiền (to_user_id) mới có quyền xác nhận quyết toán.",
        )

    settlement.status = "CONFIRMED"
    settlement.confirmed_at = datetime.utcnow()

    # Đảm bảo tiền quyết toán luôn được cộng vào ví cá nhân của người nhận
    recipient_wallet = None
    if payload and payload.recipient_wallet_id:
        recipient_wallet = db.query(Wallet).filter(
            Wallet.id == payload.recipient_wallet_id,
            Wallet.owner_user_id == current_user_id,
            Wallet.is_archived.is_(False),
        ).first()
        if not recipient_wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ví nhận tiền không hợp lệ hoặc đã bị lưu trữ.",
            )
    else:
        # Fallback: Tự động lấy ví đầu tiên của người nhận hoặc cấp ví Tiền mặt nếu chưa có
        recipient_wallet = db.query(Wallet).filter(
            Wallet.owner_user_id == current_user_id,
            Wallet.is_archived.is_(False),
        ).order_by(Wallet.created_at.asc()).first()

        if not recipient_wallet:
            recipient_wallet = Wallet(
                owner_user_id=current_user_id,
                name="Tiền mặt",
                wallet_type="CASH",
                currency="VND",
                opening_balance=0,
            )
            db.add(recipient_wallet)
            db.flush()

    if recipient_wallet:
        from_user = db.query(User).filter(User.id == settlement.from_user_id).first()
        from_name = from_user.display_name or from_user.email if from_user else "thành viên"
        group = db.query(FinanceGroup).filter(FinanceGroup.id == group_id).first()
        group_name = group.name if group else "Nhóm"

        wallet_tx = WalletTransaction(
            owner_user_id=current_user_id,
            wallet_id=recipient_wallet.id,
            transaction_type="GROUP_SETTLEMENT_RECEIVED",
            amount=settlement.amount,
            category_id=DEFAULT_GROUP_CATEGORY_ID,
            description=f"[{group_name}] Nhận quyết toán nợ từ {from_name}",
            transaction_date=datetime.now(timezone.utc),
            source_type="GROUP_SETTLEMENT",
            source_id=settlement.id,
        )
        db.add(wallet_tx)

    db.commit()
    db.refresh(settlement)
    return settlement


def reject_settlement(
    db: Session,
    group_id: uuid.UUID,
    settlement_id: uuid.UUID,
    current_user_id: uuid.UUID,
) -> GroupSettlement:
    settlement = db.query(GroupSettlement).filter(
        GroupSettlement.id == settlement_id,
        GroupSettlement.group_id == group_id,
    ).first()

    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khoản quyết toán không tồn tại.",
        )

    if settlement.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Khoản quyết toán đang ở trạng thái {settlement.status}, không thể từ chối.",
        )

    # STRICT INVARIANT: Only recipient can reject
    if settlement.to_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ người nhận tiền mới có quyền từ chối quyết toán.",
        )

    settlement.status = "REJECTED"
    settlement.rejected_at = datetime.utcnow()

    # If sender paid from personal wallet, refund it atomically
    linked_paid_tx = db.query(WalletTransaction).filter(
        WalletTransaction.source_type == "GROUP_SETTLEMENT",
        WalletTransaction.source_id == settlement.id,
        WalletTransaction.transaction_type == "GROUP_SETTLEMENT_PAID",
    ).first()
    if linked_paid_tx:
        refund_tx = WalletTransaction(
            owner_user_id=linked_paid_tx.owner_user_id,
            wallet_id=linked_paid_tx.wallet_id,
            transaction_type="INCOME",
            amount=linked_paid_tx.amount,
            description="Hoàn tiền do quyết toán bị từ chối",
            transaction_date=datetime.now(timezone.utc),
            source_type="GROUP_SETTLEMENT_REFUND",
            source_id=settlement.id,
        )
        db.add(refund_tx)

    db.commit()
    db.refresh(settlement)
    return settlement


def cancel_settlement(
    db: Session,
    group_id: uuid.UUID,
    settlement_id: uuid.UUID,
    current_user_id: uuid.UUID,
) -> GroupSettlement:
    settlement = db.query(GroupSettlement).filter(
        GroupSettlement.id == settlement_id,
        GroupSettlement.group_id == group_id,
    ).first()

    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khoản quyết toán không tồn tại.",
        )

    if settlement.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Khoản quyết toán đang ở trạng thái {settlement.status}, không thể hủy.",
        )

    # Only sender (from_user_id) can cancel
    if settlement.from_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ người tạo quyết toán mới có thể hủy bỏ.",
        )

    settlement.status = "CANCELLED"
    settlement.cancelled_at = datetime.utcnow()

    # If sender paid from personal wallet, refund it atomically
    linked_paid_tx = db.query(WalletTransaction).filter(
        WalletTransaction.source_type == "GROUP_SETTLEMENT",
        WalletTransaction.source_id == settlement.id,
        WalletTransaction.transaction_type == "GROUP_SETTLEMENT_PAID",
    ).first()
    if linked_paid_tx:
        refund_tx = WalletTransaction(
            owner_user_id=linked_paid_tx.owner_user_id,
            wallet_id=linked_paid_tx.wallet_id,
            transaction_type="INCOME",
            amount=linked_paid_tx.amount,
            description="Hoàn tiền do bạn đã hủy yêu cầu quyết toán",
            transaction_date=datetime.now(timezone.utc),
            source_type="GROUP_SETTLEMENT_REFUND",
            source_id=settlement.id,
        )
        db.add(refund_tx)

    db.commit()
    db.refresh(settlement)
    return settlement


def list_settlements(
    db: Session,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    limit: int = 50,
) -> List[GroupSettlement]:
    get_user_member_record(db, group_id, user_id)

    return (
        db.query(GroupSettlement)
        .filter(GroupSettlement.group_id == group_id)
        .order_by(GroupSettlement.created_at.desc())
        .limit(limit)
        .all()
    )

