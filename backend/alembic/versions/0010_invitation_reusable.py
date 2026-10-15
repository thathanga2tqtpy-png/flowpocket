"""0010_invitation_reusable

Revision ID: 0010_invitation_reusable
Revises: 0009_wallet_banking
Create Date: 2026-10-16 01:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0010_invitation_reusable'
down_revision = '0009_wallet_banking'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'group_invitations',
        sa.Column('is_reusable', sa.Boolean(), server_default='false', nullable=False)
    )


def downgrade() -> None:
    op.drop_column('group_invitations', 'is_reusable')

