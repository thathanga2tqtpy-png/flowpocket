import uuid
from datetime import datetime, date
from sqlalchemy import String, BigInteger, Date, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class GroupFund(Base):
    __tablename__ = "group_funds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Quỹ chung",
    )
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),  # 'ACTIVE', 'ARCHIVED'
        nullable=False,
        default="ACTIVE",
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
    group = relationship("FinanceGroup", backref="funds")
    transactions: Mapped[list["GroupFundTransaction"]] = relationship(
        "GroupFundTransaction",
        back_populates="fund",
        cascade="all, delete-orphan",
    )
    expenses: Mapped[list["GroupExpense"]] = relationship(
        "GroupExpense",
        back_populates="fund",
    )


class GroupFundTransaction(Base):
    __tablename__ = "group_fund_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    fund_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("group_funds.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    transaction_type: Mapped[str] = mapped_column(
        String(20),  # 'CONTRIBUTION', 'EXPENSE', 'WITHDRAWAL', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'
        nullable=False,
    )
    amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    contributed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    group_expense_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("group_expenses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        unique=True,  # Prevent double deduction for same expense
    )
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    transaction_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_group_fund_tx_amount_positive"),
        Index("idx_fund_tx_date", "fund_id", "transaction_date"),
    )

    # Relationships
    fund: Mapped["GroupFund"] = relationship("GroupFund", back_populates="transactions")
    contributor = relationship("User", foreign_keys=[contributed_by_user_id])
    creator = relationship("User", foreign_keys=[created_by_user_id])
    expense = relationship("GroupExpense")

