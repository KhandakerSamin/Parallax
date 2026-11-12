"""add review decisions to reports

Revision ID: 366714838dc8
Revises: 62390cecffbc
Create Date: 2026-11-08

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "366714838dc8"
down_revision: str | None = "62390cecffbc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

FK_NAME = "fk_reports_reviewed_by_id_users"


def upgrade() -> None:
    with op.batch_alter_table("reports", schema=None) as batch_op:
        batch_op.add_column(sa.Column("review_status", sa.String(length=20), server_default="pending", nullable=False))
        batch_op.add_column(sa.Column("review_note", sa.String(length=2000), nullable=True))
        batch_op.add_column(sa.Column("reviewed_by_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index(batch_op.f("ix_reports_review_status"), ["review_status"], unique=False)
        batch_op.create_foreign_key(FK_NAME, "users", ["reviewed_by_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    with op.batch_alter_table("reports", schema=None) as batch_op:
        batch_op.drop_constraint(FK_NAME, type_="foreignkey")
        batch_op.drop_index(batch_op.f("ix_reports_review_status"))
        batch_op.drop_column("reviewed_at")
        batch_op.drop_column("reviewed_by_id")
        batch_op.drop_column("review_note")
        batch_op.drop_column("review_status")
