"""create personal finance tables (wallets, categories, transactions)

Revision ID: 0003_personal_finance
Revises: 0002_create_users_and_sessions
Create Date: 2026-10-14 23:31:00.000000

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic (must be <= 32 chars)
revision: str = '0003_personal_finance'
down_revision: Union[str, None] = '0002_create_users_and_sessions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create wallets table
    op.create_table(
        'wallets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('wallet_type', sa.String(length=30), server_default='CASH', nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='VND', nullable=False),
        sa.Column('opening_balance', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('is_archived', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_wallets_owner_user_id', 'wallets', ['owner_user_id'])
    op.create_index('idx_wallets_owner_archived', 'wallets', ['owner_user_id', 'is_archived'])

    # 2. Create categories table
    op.create_table(
        'categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('icon_key', sa.String(length=50), nullable=True),
        sa.Column('is_archived', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_categories_owner_user_id', 'categories', ['owner_user_id'])
    op.create_index('idx_categories_owner_kind', 'categories', ['owner_user_id', 'kind'])

    # 3. Create wallet_transactions table
    op.create_table(
        'wallet_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_type', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.BigInteger(), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('transaction_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('transfer_group_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('source_type', sa.String(length=50), nullable=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('amount > 0', name='chk_wallet_transaction_amount_positive'),
    )
    op.create_index('ix_wallet_transactions_owner_user_id', 'wallet_transactions', ['owner_user_id'])
    op.create_index('ix_wallet_transactions_wallet_id', 'wallet_transactions', ['wallet_id'])
    op.create_index('ix_wallet_transactions_transaction_type', 'wallet_transactions', ['transaction_type'])
    op.create_index('ix_wallet_transactions_category_id', 'wallet_transactions', ['category_id'])
    op.create_index('ix_wallet_transactions_transaction_date', 'wallet_transactions', ['transaction_date'])
    op.create_index('ix_wallet_transactions_transfer_group_id', 'wallet_transactions', ['transfer_group_id'])
    op.create_index('idx_wallet_tx_owner_date', 'wallet_transactions', ['owner_user_id', 'transaction_date'])
    op.create_index('idx_wallet_tx_wallet_date', 'wallet_transactions', ['wallet_id', 'transaction_date'])

    # 4. Seed idempotent system categories (owner_user_id = NULL)
    system_categories = [
        # Expense categories
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111101"), "name": "Ăn uống", "kind": "EXPENSE", "icon_key": "utensils", "is_archived": False},
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111102"), "name": "Đi lại", "kind": "EXPENSE", "icon_key": "car", "is_archived": False},
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111103"), "name": "Mua sắm", "kind": "EXPENSE", "icon_key": "shopping-bag", "is_archived": False},
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111104"), "name": "Hóa đơn & Tiện ích", "kind": "EXPENSE", "icon_key": "receipt", "is_archived": False},
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111105"), "name": "Giải trí", "kind": "EXPENSE", "icon_key": "film", "is_archived": False},
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111106"), "name": "Y tế & Sức khỏe", "kind": "EXPENSE", "icon_key": "activity", "is_archived": False},
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111107"), "name": "Chi tiêu khác", "kind": "EXPENSE", "icon_key": "more-horizontal", "is_archived": False},

        # Income categories
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111201"), "name": "Tiền lương", "kind": "INCOME", "icon_key": "dollar-sign", "is_archived": False},
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111202"), "name": "Tiền thưởng", "kind": "INCOME", "icon_key": "award", "is_archived": False},
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111203"), "name": "Thu nhập phụ", "kind": "INCOME", "icon_key": "briefcase", "is_archived": False},
        {"id": uuid.UUID("11111111-1111-1111-1111-111111111204"), "name": "Thu nhập khác", "kind": "INCOME", "icon_key": "trending-up", "is_archived": False},
    ]

    for cat in system_categories:
        op.execute(
            sa.text(
                "INSERT INTO categories (id, owner_user_id, name, kind, icon_key, is_archived) "
                "VALUES (:id, NULL, :name, :kind, :icon_key, :is_archived) "
                "ON CONFLICT (id) DO NOTHING"
            ).bindparams(**cat)
        )


def downgrade() -> None:
    op.drop_table('wallet_transactions')
    op.drop_table('categories')
    op.drop_table('wallets')

