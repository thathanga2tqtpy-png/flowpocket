"""0008_outgoing_pending_expenses

Revision ID: 0008_outgoing_pending
Revises: 0007_qr_payment
Create Date: 2026-10-15 16:33:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0008_outgoing_pending'
down_revision = '0007_qr_payment'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'outgoing_payment_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('app_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount', sa.BigInteger(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('bank_code', sa.String(length=50), nullable=True),
        sa.Column('bank_name', sa.String(length=100), nullable=True),
        sa.Column('account_number', sa.String(length=50), nullable=True),
        sa.Column('account_holder_name', sa.String(length=100), nullable=True),
        sa.Column('qr_payload', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False),
        sa.Column('wallet_transaction_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('wallet_transactions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('amount > 0', name='chk_outgoing_payment_amount_positive'),
    )
    op.create_index('ix_outgoing_payment_requests_owner_user_id', 'outgoing_payment_requests', ['owner_user_id'])
    op.create_index('ix_outgoing_payment_requests_wallet_id', 'outgoing_payment_requests', ['wallet_id'])
    op.create_index('ix_outgoing_payment_requests_category_id', 'outgoing_payment_requests', ['category_id'])
    op.create_index('ix_outgoing_payment_requests_status', 'outgoing_payment_requests', ['status'])
    op.create_index('ix_outgoing_payment_requests_created_at', 'outgoing_payment_requests', ['created_at'])
    op.create_index('idx_outgoing_payment_user_status', 'outgoing_payment_requests', ['owner_user_id', 'status'])


def downgrade() -> None:
    op.drop_table('outgoing_payment_requests')

