import uuid
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# 1. GROUP EXPENSES & SPLITS SCHEMAS
# ==========================================

class SplitItemPayload(BaseModel):
    member_user_id: uuid.UUID
    amount: Optional[int] = Field(None, gt=0)  # Required if split_method == 'CUSTOM'


class CreateGroupExpenseRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    total_amount: int = Field(..., gt=0)
    expense_date: Optional[date] = None
    payment_source: str = Field("MEMBER", pattern="^(MEMBER|FUND)$")
    paid_by_user_id: Optional[uuid.UUID] = None  # Required if payment_source == 'MEMBER'
    fund_id: Optional[uuid.UUID] = None  # If None and source is FUND, uses group's default fund
    split_method: str = Field("EQUAL", pattern="^(EQUAL|CUSTOM)$")
    splits: List[SplitItemPayload] = Field(..., min_length=1)


class VoidExpenseRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=255)


class GroupExpenseSplitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    member_user_id: uuid.UUID
    member_name: Optional[str] = None
    member_email: Optional[str] = None
    amount_owed: int


class GroupExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    title: str
    total_amount: int
    expense_date: date
    payment_source: str
    paid_by_user_id: Optional[uuid.UUID] = None
    paid_by_name: Optional[str] = None
    fund_id: Optional[uuid.UUID] = None
    split_method: str
    status: str
    created_by_user_id: uuid.UUID
    void_reason: Optional[str] = None
    created_at: datetime
    splits: List[GroupExpenseSplitResponse] = []


# ==========================================
# 2. GROUP FUNDS SCHEMAS
# ==========================================

class GroupFundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    name: str
    description: Optional[str] = None
    status: str
    balance: int
    created_at: datetime


class FundContributionRequest(BaseModel):
    amount: int = Field(..., gt=0)
    description: Optional[str] = Field(None, max_length=255)
    transaction_date: Optional[date] = None


class FundWithdrawalRequest(BaseModel):
    amount: int = Field(..., gt=0)
    reason: str = Field(..., min_length=1, max_length=255)
    transaction_date: Optional[date] = None


class GroupFundTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fund_id: uuid.UUID
    transaction_type: str
    amount: int
    contributed_by_user_id: Optional[uuid.UUID] = None
    contributor_name: Optional[str] = None
    created_by_user_id: uuid.UUID
    group_expense_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    transaction_date: date
    created_at: datetime


# ==========================================
# 3. SETTLEMENTS & DEBT SCHEMAS
# ==========================================

class CreateSettlementRequest(BaseModel):
    to_user_id: uuid.UUID
    amount: int = Field(..., gt=0)
    note: Optional[str] = Field(None, max_length=255)


class GroupSettlementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    from_user_id: uuid.UUID
    from_user_name: Optional[str] = None
    to_user_id: uuid.UUID
    to_user_name: Optional[str] = None
    amount: int
    status: str
    note: Optional[str] = None
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


class MemberBalanceSummary(BaseModel):
    user_id: uuid.UUID
    full_name: Optional[str] = None
    email: str
    total_paid: int
    total_share: int
    settlement_paid: int
    settlement_received: int
    net_balance: int  # > 0 means to be received, < 0 means owes


class DebtSimplificationItem(BaseModel):
    from_user_id: uuid.UUID
    from_user_name: str
    to_user_id: uuid.UUID
    to_user_name: str
    amount: int


class GroupDebtOverview(BaseModel):
    group_id: uuid.UUID
    currency: str
    members_balances: List[MemberBalanceSummary]
    suggested_settlements: List[DebtSimplificationItem]
    current_user_net: int
