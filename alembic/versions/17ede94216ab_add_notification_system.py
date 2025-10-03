"""add_notification_system

Revision ID: 17ede94216ab
Revises: e752d699f9e0
Create Date: 2025-10-03 23:01:23.531793

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17ede94216ab'
down_revision: Union[str, Sequence[str], None] = 'e752d699f9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
