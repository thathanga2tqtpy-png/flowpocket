import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.models.payment_reconciliation import PaymentReconciliation
from app.schemas.qr_payment import (
    PaymentReconciliationResponse,
    PaymentReconciliationUpdate,
)
from app.services.qr_payments.constants import to_reconciliation_response


def list_reconciliations(
    db: Session, user_id: uuid.UUID, status_filter: Optional[str] = None
) -> List[PaymentReconciliationResponse]:
    query = select(PaymentReconciliation).where(PaymentReconciliation.user_id == user_id)
    if status_filter:
        query = query.where(PaymentReconciliation.status == status_filter.upper())
    query = query.order_by(desc(PaymentReconciliation.created_at))

    records = db.execute(query).scalars().all()
    return [to_reconciliation_response(r) for r in records]


def update_reconciliation(
    db: Session, user_id: uuid.UUID, recon_id: uuid.UUID, data: PaymentReconciliationUpdate
) -> PaymentReconciliationResponse:
    recon = db.get(PaymentReconciliation, recon_id)
    if not recon or recon.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bản ghi chênh lệch",
        )

    if data.status:
        valid_statuses = {"OPEN", "REVIEWED", "RESOLVED", "IGNORED"}
        if data.status.upper() not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trạng thái '{data.status}' không hợp lệ. Phải là một trong: {', '.join(valid_statuses)}",
            )
        recon.status = data.status.upper()
        if recon.status in {"RESOLVED", "IGNORED"}:
            recon.resolved_at = datetime.now(timezone.utc)

    if data.notes is not None:
        recon.notes = data.notes

    db.commit()
    db.refresh(recon)
    return to_reconciliation_response(recon)

