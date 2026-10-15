import uuid
from typing import List, Optional, Tuple
from datetime import date
from sqlalchemy.orm import Session

from app.models.group_member import GroupMember
from app.models.group_expense import GroupExpense
from app.models.group_fund import GroupFund, GroupFundTransaction
from app.models.group_settlement import GroupSettlement
from app.schemas.group_finance import (
    CreateGroupExpenseRequest,
    VoidExpenseRequest,
    FundContributionRequest,
    FundWithdrawalRequest,
    CreateSettlementRequest,
    ConfirmSettlementRequest,
    GroupDebtOverview,
)

from app.services.group_finance.constants import DEFAULT_GROUP_CATEGORY_ID, get_user_member_record
from app.services.group_finance.expense_service import (
    calculate_splits,
    create_expense,
    void_expense,
    list_expenses,
)
from app.services.group_finance.fund_service import (
    get_or_create_default_fund,
    get_fund_balance,
    contribute_to_fund,
    withdraw_from_fund,
    list_fund_transactions,
)
from app.services.group_finance.debt_calculator import (
    calculate_group_debts,
)
from app.services.group_finance.settlement_service import (
    create_settlement,
    confirm_settlement,
    reject_settlement,
    cancel_settlement,
    list_settlements,
)


class GroupFinanceService:
    """
    Facade maintaining complete backward compatibility with previous monolithic service.
    Delegates all domain calls to specialized sub-services.
    """
    get_user_member_record = staticmethod(get_user_member_record)
    calculate_splits = staticmethod(calculate_splits)
    create_expense = staticmethod(create_expense)
    void_expense = staticmethod(void_expense)
    list_expenses = staticmethod(list_expenses)

    get_or_create_default_fund = staticmethod(get_or_create_default_fund)
    get_fund_balance = staticmethod(get_fund_balance)
    contribute_to_fund = staticmethod(contribute_to_fund)
    withdraw_from_fund = staticmethod(withdraw_from_fund)
    list_fund_transactions = staticmethod(list_fund_transactions)

    calculate_group_debts = staticmethod(calculate_group_debts)

    create_settlement = staticmethod(create_settlement)
    confirm_settlement = staticmethod(confirm_settlement)
    reject_settlement = staticmethod(reject_settlement)
    cancel_settlement = staticmethod(cancel_settlement)
    list_settlements = staticmethod(list_settlements)


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

