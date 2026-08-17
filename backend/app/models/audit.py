from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, CHAR
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPKMixin, utcnow


class AuditLog(Base, UUIDPKMixin):
    __tablename__ = "audit_logs"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str | None] = mapped_column(
        CHAR(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(50), index=True)
    entity_type: Mapped[str] = mapped_column(String(50), index=True)
    entity_id: Mapped[str] = mapped_column(CHAR(36), index=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
