"""
Backward compatibility facade module.
All business logic has been modularized into app.services.group_finance package.
"""

from app.services.group_finance import (
    DEFAULT_GROUP_CATEGORY_ID,
    GroupFinanceService,
    get_user_member_record,
    calculate_splits,
    create_expense,
    void_expense,
    list_expenses,
    get_or_create_default_fund,
    get_fund_balance,
    contribute_to_fund,
    withdraw_from_fund,
    list_fund_transactions,
    calculate_group_debts,
    create_settlement,
    confirm_settlement,
    reject_settlement,
    cancel_settlement,
    list_settlements,
)

__all__ = [
    "DEFAULT_GROUP_CATEGORY_ID",
    "GroupFinanceService",
    "get_user_member_record",
    "calculate_splits",
    "create_expense",
    "void_expense",
    "list_expenses",
    "get_or_create_default_fund",
    "get_fund_balance",
    "contribute_to_fund",
    "withdraw_from_fund",
    "list_fund_transactions",
    "calculate_group_debts",
    "create_settlement",
    "confirm_settlement",
    "reject_settlement",
    "cancel_settlement",
    "list_settlements",
]
