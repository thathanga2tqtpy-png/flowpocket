"""0009_wallet_banking_fields

Revision ID: 0009_wallet_banking
Revises: 0008_outgoing_pending
Create Date: 2026-10-15 17:11:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0009_wallet_banking'
down_revision = '0008_outgoing_pending'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add banking fields to wallets table
    op.add_column('wallets', sa.Column('bank_code', sa.String(length=50), nullable=True))
    op.add_column('wallets', sa.Column('bank_name', sa.String(length=100), nullable=True))
    op.add_column('wallets', sa.Column('account_number', sa.String(length=50), nullable=True))
    op.add_column('wallets', sa.Column('account_holder_name', sa.String(length=100), nullable=True))

    # 2. Make receiving_account_id nullable in incoming_payment_requests (allow direct wallet link)
    op.alter_column('incoming_payment_requests', 'receiving_account_id', nullable=True)


def downgrade() -> None:
    op.alter_column('incoming_payment_requests', 'receiving_account_id', nullable=False)
    op.drop_column('wallets', 'account_holder_name')
    op.drop_column('wallets', 'account_number')
    op.drop_column('wallets', 'bank_name')
    op.drop_column('wallets', 'bank_code')

