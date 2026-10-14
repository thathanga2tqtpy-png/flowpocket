import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.wallet import WalletWithBalanceResponse


class TransactionCreate(BaseModel):
    wallet_id: uuid.UUID
    transaction_type: str = Field(description="INCOME hoặc EXPENSE")
    amount: int = Field(gt=0, description="Số tiền VND (phải là số nguyên dương)")
    category_id: uuid.UUID | None = None
    description: str | None = Field(default=None, max_length=255)
    transaction_date: datetime | None = None


class TransferCreate(BaseModel):
    source_wallet_id: uuid.UUID
    destination_wallet_id: uuid.UUID
    amount: int = Field(gt=0, description="Số tiền chuyển (VND, số nguyên dương)")
    description: str | None = Field(default=None, max_length=255)
    transaction_date: datetime | None = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    wallet_id: uuid.UUID
    wallet_name: str
    transaction_type: str
    amount: int
    category_id: uuid.UUID | None
    category_name: str | None
    description: str | None
    transaction_date: datetime
    transfer_group_id: uuid.UUID | None
    created_at: datetime


class CategoryExpenseBreakdown(BaseModel):
    category_id: uuid.UUID | None
    category_name: str
    total_amount: int
    percentage: float


class FinancialSummary(BaseModel):
    total_assets: int
    total_income: int
    total_expense: int
    net_cash_flow: int
    wallets: list[WalletWithBalanceResponse]
    expense_breakdown: list[CategoryExpenseBreakdown]

