"""add qr payment receiving accounts and reconciliations

Revision ID: 0007_qr_payment
Revises: 0006_group_category
Create Date: 2026-10-15 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic (must be <= 32 chars).
revision: str = '0007_qr_payment'
down_revision: Union[str, None] = '0006_group_category'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create receiving_accounts
    op.create_table(
        'receiving_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('bank_code', sa.String(20), nullable=False),
        sa.Column('bank_name', sa.String(100), nullable=False),
        sa.Column('account_number', sa.String(50), nullable=False),
        sa.Column('account_holder_name', sa.String(100), nullable=False),
        sa.Column('display_name', sa.String(100), nullable=True),
        sa.Column('linked_wallet_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('wallets.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_default', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_receiving_accounts_user_active', 'receiving_accounts', ['user_id', 'is_active'])

    # 2. Create incoming_payment_requests
    op.create_table(
        'incoming_payment_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('receiving_account_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('receiving_accounts.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('target_wallet_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('wallets.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('reference_code', sa.String(32), nullable=False, unique=True),
        sa.Column('expected_amount', sa.BigInteger(), nullable=False),
        sa.Column('actual_amount', sa.BigInteger(), nullable=True),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('transfer_memo', sa.String(50), nullable=False),
        sa.Column('qr_payload', sa.Text(), nullable=False),
        sa.Column('status', sa.String(30), server_default='PENDING', nullable=False),
        sa.Column('bank_code_snapshot', sa.String(20), nullable=False),
        sa.Column('bank_name_snapshot', sa.String(100), nullable=False),
        sa.Column('account_number_snapshot', sa.String(50), nullable=False),
        sa.Column('account_holder_snapshot', sa.String(100), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('expected_amount > 0', name='chk_incoming_expected_amount_positive'),
        sa.CheckConstraint('actual_amount IS NULL OR actual_amount >= 0', name='chk_incoming_actual_amount_non_negative'),
    )
    op.create_index('idx_incoming_payment_requests_user_status', 'incoming_payment_requests', ['user_id', 'status'])
    op.create_index('idx_incoming_payment_requests_created_at', 'incoming_payment_requests', ['created_at'])
    op.create_index('idx_incoming_payment_requests_ref_code', 'incoming_payment_requests', ['reference_code'])

    # 3. Create payment_reconciliations
    op.create_table(
        'payment_reconciliations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('payment_request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('incoming_payment_requests.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('expected_amount', sa.BigInteger(), nullable=False),
        sa.Column('actual_amount', sa.BigInteger(), nullable=False),
        sa.Column('difference_amount', sa.BigInteger(), nullable=False),
        sa.Column('difference_type', sa.String(30), nullable=False),
        sa.Column('status', sa.String(30), server_default='OPEN', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_payment_reconciliations_user_status', 'payment_reconciliations', ['user_id', 'status'])


def downgrade() -> None:
    op.drop_table('payment_reconciliations')
    op.drop_table('incoming_payment_requests')
    op.drop_table('receiving_accounts')

