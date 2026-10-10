from datetime import datetime

from sqlalchemy import JSON, BigInteger, Boolean, CHAR, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPKMixin, TimestampMixin


class DesktopLinkCode(Base, UUIDPKMixin, TimestampMixin):
    """Code given to a school so its desktop computers (« postes ») can join the
    school's sync space. Only a hash is stored; the code is shown once."""

    __tablename__ = "desktop_link_codes"

    school_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    code_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str | None] = mapped_column(CHAR(36), nullable=True)


class DesktopDevice(Base, UUIDPKMixin, TimestampMixin):
    """A desktop computer linked to a school. It authenticates with a bearer token
    (stored hashed) on the push/pull endpoints."""

    __tablename__ = "desktop_devices"

    school_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    nom: Mapped[str] = mapped_column(String(255))
    # Short per-school label (P1, P2…) the desktop puts in receipt numbers and
    # matricules so two computers never generate the same one.
    code_poste: Mapped[str] = mapped_column(String(10))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class DesktopSyncRecord(Base):
    """Latest known version of one row of a desktop table, per school.

    The server does not interpret `data`: desktops own the schema. Conflicts are
    resolved last-writer-wins on `modified_at` (client clock, milliseconds). Every
    write gets a new `seq`, so a desktop pulls everything after its last `seq`."""

    __tablename__ = "desktop_sync_records"
    __table_args__ = (
        UniqueConstraint("school_id", "table_name", "record_uuid", name="uq_desktop_sync_record"),
    )

    seq: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    school_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    table_name: Mapped[str] = mapped_column(String(64))
    record_uuid: Mapped[str] = mapped_column(String(255))
    data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    modified_at: Mapped[int] = mapped_column(BigInteger)
    device_id: Mapped[str] = mapped_column(CHAR(36))
