"""add category to group expenses and default group category

Revision ID: 0006_group_category
Revises: 0005_group_finance
Create Date: 2026-10-15 12:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic (must be <= 32 chars).
revision: str = '0006_group_category'
down_revision: Union[str, None] = '0005_group_finance'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

GROUP_CATEGORY_ID = '11111111-1111-1111-1111-111111111108'


def upgrade() -> None:
    # 1. Add category_id to group_expenses
    op.add_column(
        'group_expenses',
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    )
    op.create_index('idx_group_expenses_category_id', 'group_expenses', ['category_id'])

    # 2. Insert default 'Chi tiêu nhóm' category if not exists
    op.execute(f"""
        INSERT INTO categories (id, owner_user_id, name, kind, icon_key, is_archived, created_at, updated_at)
        VALUES (
            '{GROUP_CATEGORY_ID}',
            NULL,
            'Chi tiêu nhóm',
            'EXPENSE',
            'users',
            FALSE,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    """)

    # 3. Backfill existing group expenses and wallet transactions
    op.execute(f"""
        UPDATE group_expenses
        SET category_id = '{GROUP_CATEGORY_ID}'
        WHERE category_id IS NULL;
    """)

    op.execute(f"""
        UPDATE wallet_transactions
        SET category_id = '{GROUP_CATEGORY_ID}'
        WHERE source_type = 'GROUP_EXPENSE' AND category_id IS NULL;
    """)


def downgrade() -> None:
    op.drop_index('idx_group_expenses_category_id', table_name='group_expenses')
    op.drop_column('group_expenses', 'category_id')
    op.execute(f"DELETE FROM categories WHERE id = '{GROUP_CATEGORY_ID}';")

