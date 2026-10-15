from app.services.qr_payments.constants import (
    DEFAULT_INCOME_CATEGORY_ID,
    DEFAULT_EXPENSE_CATEGORY_ID,
    mask_account_number,
    to_account_response,
    to_reconciliation_response,
    to_request_response,
    to_outgoing_response,
)
from app.services.qr_payments.incoming_service import (
    get_supported_banks,
    list_receiving_accounts,
    get_receiving_account,
    create_receiving_account,
    update_receiving_account,
    delete_receiving_account,
    create_payment_request,
    list_payment_requests,
    get_payment_request,
    cancel_payment_request,
    confirm_payment_received,
)
from app.services.qr_payments.reconciliation_service import (
    list_reconciliations,
    update_reconciliation,
)
from app.services.qr_payments.outgoing_service import (
    create_outgoing_payment,
    list_outgoing_requests,
    confirm_outgoing_request,
    confirm_all_outgoing_requests,
    cancel_outgoing_request,
)


class QRPaymentService:
    # Banks
    get_supported_banks = staticmethod(get_supported_banks)

    # Legacy receiving accounts
    _to_account_response = staticmethod(to_account_response)
    list_receiving_accounts = staticmethod(list_receiving_accounts)
    get_receiving_account = staticmethod(get_receiving_account)
    create_receiving_account = staticmethod(create_receiving_account)
    update_receiving_account = staticmethod(update_receiving_account)
    delete_receiving_account = staticmethod(delete_receiving_account)

    # Incoming requests
    _to_request_response = staticmethod(to_request_response)
    create_payment_request = staticmethod(create_payment_request)
    list_payment_requests = staticmethod(list_payment_requests)
    get_payment_request = staticmethod(get_payment_request)
    cancel_payment_request = staticmethod(cancel_payment_request)
    confirm_payment_received = staticmethod(confirm_payment_received)

    # Reconciliations
    _to_reconciliation_response = staticmethod(to_reconciliation_response)
    list_reconciliations = staticmethod(list_reconciliations)
    update_reconciliation = staticmethod(update_reconciliation)

    # Outgoing requests
    _to_outgoing_response = staticmethod(to_outgoing_response)
    create_outgoing_payment = staticmethod(create_outgoing_payment)
    create_outgoing_request = staticmethod(create_outgoing_payment)
    list_outgoing_requests = staticmethod(list_outgoing_requests)
    confirm_outgoing_request = staticmethod(confirm_outgoing_request)
    confirm_all_outgoing_requests = staticmethod(confirm_all_outgoing_requests)
    cancel_outgoing_request = staticmethod(cancel_outgoing_request)


__all__ = [
    "QRPaymentService",
    "DEFAULT_INCOME_CATEGORY_ID",
    "DEFAULT_EXPENSE_CATEGORY_ID",
    "mask_account_number",
    "get_supported_banks",
    "create_payment_request",
    "list_payment_requests",
    "get_payment_request",
    "cancel_payment_request",
    "confirm_payment_received",
    "list_reconciliations",
    "update_reconciliation",
    "create_outgoing_payment",
    "list_outgoing_requests",
    "confirm_outgoing_request",
    "confirm_all_outgoing_requests",
    "cancel_outgoing_request",
]
