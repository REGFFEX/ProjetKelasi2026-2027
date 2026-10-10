"""add desktop sync tables

Revision ID: c41d7e9a2b10
Revises: 5b4a9a780af2
Create Date: 2026-10-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c41d7e9a2b10'
down_revision: Union[str, None] = '5b4a9a780af2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('desktop_link_codes',
    sa.Column('school_id', sa.CHAR(length=36), nullable=False),
    sa.Column('code_hash', sa.String(length=64), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('revoked', sa.Boolean(), nullable=False),
    sa.Column('created_by', sa.CHAR(length=36), nullable=True),
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code_hash')
    )
    op.create_index(op.f('ix_desktop_link_codes_school_id'), 'desktop_link_codes', ['school_id'], unique=False)
    op.create_table('desktop_devices',
    sa.Column('school_id', sa.CHAR(length=36), nullable=False),
    sa.Column('nom', sa.String(length=255), nullable=False),
    sa.Column('code_poste', sa.String(length=10), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('last_seen_at', sa.DateTime(), nullable=True),
    sa.Column('revoked', sa.Boolean(), nullable=False),
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token_hash')
    )
    op.create_index(op.f('ix_desktop_devices_school_id'), 'desktop_devices', ['school_id'], unique=False)
    op.create_table('desktop_sync_records',
    sa.Column('seq', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('school_id', sa.CHAR(length=36), nullable=False),
    sa.Column('table_name', sa.String(length=64), nullable=False),
    sa.Column('record_uuid', sa.String(length=255), nullable=False),
    sa.Column('data', sa.JSON(), nullable=True),
    sa.Column('deleted', sa.Boolean(), nullable=False),
    sa.Column('modified_at', sa.BigInteger(), nullable=False),
    sa.Column('device_id', sa.CHAR(length=36), nullable=False),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('seq'),
    sa.UniqueConstraint('school_id', 'table_name', 'record_uuid', name='uq_desktop_sync_record')
    )
    op.create_index(op.f('ix_desktop_sync_records_school_id'), 'desktop_sync_records', ['school_id'], unique=False)


def downgrade() -> None:
    # Dropping the tables drops their indexes; MySQL refuses to drop an index
    # that still backs a foreign key.
    op.drop_table('desktop_sync_records')
    op.drop_table('desktop_devices')
    op.drop_table('desktop_link_codes')
