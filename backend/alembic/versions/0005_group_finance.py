"""create group expenses, splits, funds and settlements tables

Revision ID: 0005_group_finance
Revises: 0004_groups_and_members
Create Date: 2026-10-14 23:51:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic (must be <= 32 chars).
revision: str = '0005_group_finance'
down_revision: Union[str, None] = '0004_groups_and_members'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create group_funds table
    op.create_table(
        'group_funds',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('finance_groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False, server_default='Quỹ chung'),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_group_funds_group_id', 'group_funds', ['group_id'])

    # 2. Create group_expenses table
    op.create_table(
        'group_expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('finance_groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('total_amount', sa.BigInteger(), nullable=False),
        sa.Column('expense_date', sa.Date(), nullable=False),
        sa.Column('payment_source', sa.String(length=20), nullable=False, server_default='MEMBER'),
        sa.Column('paid_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('fund_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('group_funds.id', ondelete='SET NULL'), nullable=True),
        sa.Column('split_method', sa.String(length=20), nullable=False, server_default='EQUAL'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='POSTED'),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('void_reason', sa.String(length=255), nullable=True),
        sa.Column('voided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('total_amount > 0', name='chk_group_expenses_total_positive'),
    )
    op.create_index('idx_group_expenses_group_date', 'group_expenses', ['group_id', 'expense_date', 'status'])
    op.create_index('idx_group_expenses_paid_by', 'group_expenses', ['paid_by_user_id'])
    op.create_index('idx_group_expenses_fund_id', 'group_expenses', ['fund_id'])

    # 3. Create group_expense_splits table
    op.create_table(
        'group_expense_splits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('expense_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('group_expenses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('amount_owed', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('amount_owed > 0', name='chk_group_expense_splits_amount_positive'),
    )
    op.create_index('idx_group_splits_expense_member', 'group_expense_splits', ['expense_id', 'member_user_id'], unique=True)
    op.create_index('idx_group_splits_member_user_id', 'group_expense_splits', ['member_user_id'])

    # 4. Create group_fund_transactions table
    op.create_table(
        'group_fund_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('fund_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('group_funds.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_type', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.BigInteger(), nullable=False),
        sa.Column('contributed_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('group_expense_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('group_expenses.id', ondelete='SET NULL'), nullable=True, unique=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('amount > 0', name='chk_group_fund_tx_amount_positive'),
    )
    op.create_index('idx_fund_tx_date', 'group_fund_transactions', ['fund_id', 'transaction_date'])
    op.create_index('idx_fund_tx_contributed_by', 'group_fund_transactions', ['contributed_by_user_id'])

    # 5. Create group_settlements table
    op.create_table(
        'group_settlements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('finance_groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('from_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('to_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('amount', sa.BigInteger(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('note', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('amount > 0', name='chk_group_settlement_amount_positive'),
        sa.CheckConstraint('from_user_id != to_user_id', name='chk_group_settlement_different_users'),
    )
    op.create_index('idx_settlement_group_status', 'group_settlements', ['group_id', 'status'])
    op.create_index('idx_settlement_from_user', 'group_settlements', ['from_user_id'])
    op.create_index('idx_settlement_to_user', 'group_settlements', ['to_user_id'])


def downgrade() -> None:
    op.drop_table('group_settlements')
    op.drop_table('group_fund_transactions')
    op.drop_table('group_expense_splits')
    op.drop_table('group_expenses')
    op.drop_table('group_funds')

