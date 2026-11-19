"""add game progress and rename score completed_rooms to completed_levels

Revision ID: b7d3e9f41a2c
Revises: 0cb4a1a1b044
Create Date: 2026-11-16 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'b7d3e9f41a2c'
down_revision = '0cb4a1a1b044'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        'score',
        'completed_rooms',
        new_column_name='completed_levels',
        existing_type=sa.Integer(),
        existing_nullable=False,
    )
    op.create_table(
        'gameprogress',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('current_level', sa.Integer(), nullable=False),
        sa.Column('total_points', sa.Integer(), nullable=False),
        sa.Column('is_finished', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id'),
    )


def downgrade():
    op.drop_table('gameprogress')
    op.alter_column(
        'score',
        'completed_levels',
        new_column_name='completed_rooms',
        existing_type=sa.Integer(),
        existing_nullable=False,
    )
