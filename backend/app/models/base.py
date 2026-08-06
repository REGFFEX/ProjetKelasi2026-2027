import uuid
from datetime import datetime, timezone

from sqlalchemy import CHAR, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UUIDPKMixin:
    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=gen_uuid)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
