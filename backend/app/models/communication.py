import enum

from sqlalchemy import String, Text, ForeignKey, CHAR
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPKMixin, TimestampMixin


class AnnouncementTarget(str, enum.Enum):
    tous = "tous"
    parents = "parents"
    enseignants = "enseignants"
    classe = "classe"


class Announcement(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "announcements"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    author_user_id: Mapped[str | None] = mapped_column(
        CHAR(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    cible: Mapped[AnnouncementTarget] = mapped_column(SAEnum(AnnouncementTarget), default=AnnouncementTarget.tous)
    titre: Mapped[str] = mapped_column(String(255))
    contenu: Mapped[str] = mapped_column(Text)
