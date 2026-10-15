import uuid
from datetime import datetime
from sqlalchemy import String, BigInteger, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Wallet(Base):
    __tablename__ = "wallets"

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
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    wallet_type: Mapped[str] = mapped_column(
        String(30),
        default="CASH",
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        default="VND",
        nullable=False,
    )
    opening_balance: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
    )
    bank_code: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    bank_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    account_number: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    account_holder_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
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
    transactions: Mapped[list["WalletTransaction"]] = relationship(
        "WalletTransaction",
        back_populates="wallet",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_wallets_owner_archived", "owner_user_id", "is_archived"),
    )

