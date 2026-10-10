import enum
from datetime import date

from sqlalchemy import String, Date
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPKMixin, TimestampMixin


class SubscriptionStatus(str, enum.Enum):
    actif = "actif"
    essai = "essai"
    expire = "expire"


class School(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "schools"

    nom: Mapped[str] = mapped_column(String(255))
    logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    adresse: Mapped[str] = mapped_column(String(500), default="")
    telephone: Mapped[str] = mapped_column(String(50), default="")
    statut_abonnement: Mapped[SubscriptionStatus] = mapped_column(
        SAEnum(SubscriptionStatus), default=SubscriptionStatus.actif
    )
    date_creation: Mapped[date] = mapped_column(Date, default=date.today)
