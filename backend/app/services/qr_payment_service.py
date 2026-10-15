"""
Backward-compatibility facade module for QR Payment services.
All business logic has been modularized into app.services.qr_payments package.
"""

from app.services.qr_payments import (
    QRPaymentService,
    DEFAULT_INCOME_CATEGORY_ID,
    DEFAULT_EXPENSE_CATEGORY_ID,
    mask_account_number,
)

__all__ = [
    "QRPaymentService",
    "DEFAULT_INCOME_CATEGORY_ID",
    "DEFAULT_EXPENSE_CATEGORY_ID",
    "mask_account_number",
]
