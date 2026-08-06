import enum

from sqlalchemy import String, ForeignKey, CHAR
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPKMixin, TimestampMixin


class Role(str, enum.Enum):
    super_admin = "super_admin"
    school_admin = "school_admin"
    secretary = "secretary"
    accountant = "accountant"
    teacher = "teacher"
    parent = "parent"


class UserStatus(str, enum.Enum):
    actif = "actif"
    inactif = "inactif"


class User(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "users"

    school_id: Mapped[str | None] = mapped_column(
        CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True
    )
    nom: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    telephone: Mapped[str] = mapped_column(String(50), default="")
    role: Mapped[Role] = mapped_column(SAEnum(Role))
    statut: Mapped[UserStatus] = mapped_column(SAEnum(UserStatus), default=UserStatus.actif)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
