import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class ReceivingAccount(Base):
    __tablename__ = "receiving_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bank_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    bank_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    account_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    account_holder_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    display_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    linked_wallet_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
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
    user: Mapped["User"] = relationship("User")
    linked_wallet: Mapped["Wallet | None"] = relationship("Wallet")
    payment_requests: Mapped[list["IncomingPaymentRequest"]] = relationship(
        "IncomingPaymentRequest",
        back_populates="receiving_account",
    )

    __table_args__ = (
        Index("idx_receiving_accounts_user_active", "user_id", "is_active"),
    )

