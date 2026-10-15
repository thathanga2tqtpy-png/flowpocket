import uuid
from datetime import datetime
from sqlalchemy import String, BigInteger, DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class PaymentReconciliation(Base):
    __tablename__ = "payment_reconciliations"

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
    payment_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("incoming_payment_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    expected_amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    actual_amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    # actual_amount - expected_amount
    # < 0: SHORTFALL (Nhận thiếu)
    # > 0: OVERPAYMENT (Nhận thừa)
    # = 0: MATCHED
    difference_amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    # Types: SHORTFALL, OVERPAYMENT, MATCHED
    difference_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )
    # Status: OPEN, REVIEWED, RESOLVED, IGNORED
    status: Mapped[str] = mapped_column(
        String(30),
        default="OPEN",
        nullable=False,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
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
    payment_request: Mapped["IncomingPaymentRequest"] = relationship(
        "IncomingPaymentRequest",
        back_populates="reconciliation",
    )

    __table_args__ = (
        Index("idx_payment_reconciliations_user_status", "user_id", "status"),
    )

