"""add WELCOME to emailkind

Revision ID: d4e8b1c6a2f7
Revises: c3f1a7d2e9b4
Create Date: 2026-10-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd4e8b1c6a2f7'
down_revision: Union[str, Sequence[str], None] = 'c3f1a7d2e9b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # emailkind is a native Postgres enum. ADD VALUE runs outside the migration's transaction, so
    # the new value is usable straight away; IF NOT EXISTS makes a second run harmless.
    if op.get_context().dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE emailkind ADD VALUE IF NOT EXISTS 'WELCOME'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres cannot remove a value from an enum type. WELCOME stays; it is harmless unused.
    pass
