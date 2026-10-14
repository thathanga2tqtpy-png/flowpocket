import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class WalletCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    wallet_type: str = Field(default="CASH", description="CASH, BANK, E_WALLET, OTHER")
    opening_balance: int = Field(default=0, ge=0, description="Số dư ban đầu (VND, số nguyên không âm)")
    currency: str = Field(default="VND", max_length=10)


class WalletUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    wallet_type: str | None = None
    is_archived: bool | None = None


class WalletResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_user_id: uuid.UUID
    name: str
    wallet_type: str
    currency: str
    opening_balance: int
    is_archived: bool
    created_at: datetime


class WalletWithBalanceResponse(WalletResponse):
    current_balance: int

