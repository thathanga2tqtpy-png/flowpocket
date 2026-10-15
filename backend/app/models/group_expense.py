import uuid
from datetime import datetime, date
from sqlalchemy import String, BigInteger, Date, DateTime, ForeignKey, Index, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class GroupExpense(Base):
    __tablename__ = "group_expenses"

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
    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    total_amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    expense_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    payment_source: Mapped[str] = mapped_column(
        String(20),  # 'MEMBER', 'FUND'
        nullable=False,
        default="MEMBER",
    )
    paid_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    fund_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("group_funds.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    split_method: Mapped[str] = mapped_column(
        String(20),  # 'EQUAL', 'CUSTOM'
        nullable=False,
        default="EQUAL",
    )
    status: Mapped[str] = mapped_column(
        String(20),  # 'POSTED', 'VOID'
        nullable=False,
        default="POSTED",
        index=True,
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    void_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    voided_at: Mapped[datetime | None] = mapped_column(
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

    __table_args__ = (
        CheckConstraint("total_amount > 0", name="chk_group_expenses_total_positive"),
        Index("idx_group_expenses_group_date", "group_id", "expense_date", "status"),
    )

    # Relationships
    group = relationship("FinanceGroup", backref="expenses")
    payer = relationship("User", foreign_keys=[paid_by_user_id])
    creator = relationship("User", foreign_keys=[created_by_user_id])
    fund = relationship("GroupFund", back_populates="expenses")
    category = relationship("Category", foreign_keys=[category_id])
    splits: Mapped[list["GroupExpenseSplit"]] = relationship(
        "GroupExpenseSplit",
        back_populates="expense",
        cascade="all, delete-orphan",
    )


class GroupExpenseSplit(Base):
    __tablename__ = "group_expense_splits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    expense_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("group_expenses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    member_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount_owed: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("amount_owed > 0", name="chk_group_expense_splits_amount_positive"),
        Index("idx_group_splits_expense_member", "expense_id", "member_user_id", unique=True),
    )

    expense: Mapped["GroupExpense"] = relationship("GroupExpense", back_populates="splits")
    member = relationship("User", foreign_keys=[member_user_id])

