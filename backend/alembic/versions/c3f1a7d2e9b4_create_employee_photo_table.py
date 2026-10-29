"""create employee_photo table, add employee.photo_updated_at

Revision ID: c3f1a7d2e9b4
Revises: b2d0cbaf9a5f
Create Date: 2026-10-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401  (autogenerate emits sqlmodel.sql.sqltypes.AutoString)


# revision identifiers, used by Alembic.
revision: str = 'c3f1a7d2e9b4'
down_revision: Union[str, Sequence[str], None] = 'b2d0cbaf9a5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('employee_photo',
    sa.Column('employee_id', sa.Uuid(), nullable=False),
    sa.Column('content_type', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
    sa.Column('data', sa.LargeBinary(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['employee_id'], ['employee.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('employee_id')
    )
    op.add_column('employee', sa.Column('photo_updated_at', sa.DateTime(timezone=True), nullable=True))

    # Supabase exposes public tables through its REST API with the public anon key.
    # RLS with no policies blocks that API; the backend connects as postgres and bypasses RLS.
    op.execute("ALTER TABLE employee_photo ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('employee', 'photo_updated_at')
    op.drop_table('employee_photo')
