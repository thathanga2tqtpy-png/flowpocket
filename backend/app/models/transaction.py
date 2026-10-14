import uuid
from datetime import datetime
from sqlalchemy import String, BigInteger, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Types: INCOME, EXPENSE, TRANSFER_OUT, TRANSFER_IN, GROUP_EXPENSE_PAYMENT, GROUP_SETTLEMENT, FUND_CONTRIBUTION, ADJUSTMENT
    transaction_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    # Linked ID for transfer pairs (same UUID for both TRANSFER_OUT and TRANSFER_IN)
    transfer_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    source_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    wallet: Mapped["Wallet"] = relationship(
        "Wallet",
        back_populates="transactions",
    )
    category: Mapped["Category | None"] = relationship(
        "Category",
        back_populates="transactions",
    )

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_wallet_transaction_amount_positive"),
        Index("idx_wallet_tx_owner_date", "owner_user_id", "transaction_date"),
        Index("idx_wallet_tx_wallet_date", "wallet_id", "transaction_date"),
    )

