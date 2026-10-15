import uuid
from typing import Optional
from app.models.receiving_account import ReceivingAccount
from app.models.payment_reconciliation import PaymentReconciliation
from app.models.incoming_payment_request import IncomingPaymentRequest
from app.models.outgoing_payment_request import OutgoingPaymentRequest
from app.schemas.qr_payment import (
    ReceivingAccountResponse,
    PaymentReconciliationResponse,
    IncomingPaymentRequestResponse,
    OutgoingPaymentRequestResponse,
)

DEFAULT_INCOME_CATEGORY_ID = uuid.UUID("11111111-1111-1111-1111-111111111204")
DEFAULT_EXPENSE_CATEGORY_ID = uuid.UUID("11111111-1111-1111-1111-111111111107")


def mask_account_number(account_number: str) -> str:
    """Mask account number for security: show only the last 4 digits."""
    clean = account_number.strip()
    if len(clean) <= 4:
        return clean
    return f"•••• {clean[-4:]}"


def to_account_response(acc: ReceivingAccount) -> ReceivingAccountResponse:
    return ReceivingAccountResponse(
        id=acc.id,
        bank_code=acc.bank_code,
        bank_name=acc.bank_name,
        account_number=acc.account_number,
        masked_account_number=mask_account_number(acc.account_number),
        account_holder_name=acc.account_holder_name,
        display_name=acc.display_name,
        linked_wallet_id=acc.linked_wallet_id,
        is_default=acc.is_default,
        is_active=acc.is_active,
        created_at=acc.created_at,
        updated_at=acc.updated_at,
    )


def to_reconciliation_response(r: PaymentReconciliation) -> PaymentReconciliationResponse:
    return PaymentReconciliationResponse(
        id=r.id,
        payment_request_id=r.payment_request_id,
        expected_amount=r.expected_amount,
        actual_amount=r.actual_amount,
        difference_amount=r.difference_amount,
        difference_type=r.difference_type,
        status=r.status,
        notes=r.notes,
        resolved_at=r.resolved_at,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def to_request_response(req: IncomingPaymentRequest) -> IncomingPaymentRequestResponse:
    recon_resp = (
        to_reconciliation_response(req.reconciliation)
        if req.reconciliation
        else None
    )
    return IncomingPaymentRequestResponse(
        id=req.id,
        reference_code=req.reference_code,
        expected_amount=req.expected_amount,
        actual_amount=req.actual_amount,
        receiving_account_id=req.receiving_account_id,
        target_wallet_id=req.target_wallet_id,
        category_id=req.category_id,
        description=req.description,
        transfer_memo=req.transfer_memo,
        qr_payload=req.qr_payload,
        status=req.status,
        bank_code_snapshot=req.bank_code_snapshot,
        bank_name_snapshot=req.bank_name_snapshot,
        account_number_snapshot=req.account_number_snapshot,
        masked_account_number_snapshot=mask_account_number(req.account_number_snapshot),
        account_holder_snapshot=req.account_holder_snapshot,
        confirmed_at=req.confirmed_at,
        cancelled_at=req.cancelled_at,
        created_at=req.created_at,
        updated_at=req.updated_at,
        reconciliation=recon_resp,
    )


def to_outgoing_response(
    req: OutgoingPaymentRequest,
    wallet_name: Optional[str] = None,
    category_name: Optional[str] = None,
) -> OutgoingPaymentRequestResponse:
    return OutgoingPaymentRequestResponse(
        id=req.id,
        owner_user_id=req.owner_user_id,
        wallet_id=req.wallet_id,
        category_id=req.category_id,
        amount=req.amount,
        description=req.description,
        bank_code=req.bank_code,
        bank_name=req.bank_name,
        account_number=req.account_number,
        account_holder_name=req.account_holder_name,
        qr_payload=req.qr_payload,
        status=req.status,
        wallet_transaction_id=req.wallet_transaction_id,
        created_at=req.created_at,
        confirmed_at=req.confirmed_at,
        wallet_name=wallet_name,
        category_name=category_name,
    )

