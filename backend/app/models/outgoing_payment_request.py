import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, BigInteger, DateTime, ForeignKey, Text, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class OutgoingPaymentRequest(Base):
    __tablename__ = "outgoing_payment_requests"

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
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    # Recipient bank snapshot from QR
    bank_code: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    bank_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    account_number: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    account_holder_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    qr_payload: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    # Status: PENDING, CONFIRMED, CANCELLED
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
        index=True,
    )
    wallet_transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallet_transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    wallet = relationship("Wallet")
    category = relationship("Category")
    wallet_transaction = relationship("WalletTransaction")

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_outgoing_payment_amount_positive"),
        Index("idx_outgoing_payment_user_status", "owner_user_id", "status"),
    )

