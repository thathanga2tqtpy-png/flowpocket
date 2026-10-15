import uuid
from datetime import datetime
from sqlalchemy import String, BigInteger, DateTime, ForeignKey, Index, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class IncomingPaymentRequest(Base):
    __tablename__ = "incoming_payment_requests"

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
    receiving_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("receiving_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    target_wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    reference_code: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        nullable=False,
        index=True,
    )
    expected_amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    actual_amount: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    transfer_memo: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    qr_payload: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    # Status: PENDING, USER_CONFIRMED, CANCELLED, EXPIRED
    status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
        index=True,
    )
    # Bank snapshot at time of request generation
    bank_code_snapshot: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    bank_name_snapshot: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    account_number_snapshot: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    account_holder_snapshot: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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
    user: Mapped["User"] = relationship("User")
    receiving_account: Mapped["ReceivingAccount"] = relationship(
        "ReceivingAccount",
        back_populates="payment_requests",
    )
    target_wallet: Mapped["Wallet"] = relationship("Wallet")
    category: Mapped["Category | None"] = relationship("Category")
    reconciliation: Mapped["PaymentReconciliation | None"] = relationship(
        "PaymentReconciliation",
        back_populates="payment_request",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("expected_amount > 0", name="chk_incoming_expected_amount_positive"),
        CheckConstraint("actual_amount IS NULL OR actual_amount >= 0", name="chk_incoming_actual_amount_non_negative"),
        Index("idx_incoming_payment_requests_user_status", "user_id", "status"),
        Index("idx_incoming_payment_requests_created_at", "created_at"),
    )

