import enum
from datetime import date

from sqlalchemy import String, Date, ForeignKey, CHAR
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPKMixin, TimestampMixin


class AcademicYearStatus(str, enum.Enum):
    active = "active"
    archivee = "archivee"


class AcademicYear(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "academic_years"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    libelle: Mapped[str] = mapped_column(String(50))
    date_debut: Mapped[date] = mapped_column(Date)
    date_fin: Mapped[date] = mapped_column(Date)
    statut: Mapped[AcademicYearStatus] = mapped_column(SAEnum(AcademicYearStatus), default=AcademicYearStatus.active)


class Term(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "terms"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    academic_year_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True
    )
    libelle: Mapped[str] = mapped_column(String(50))
    date_debut: Mapped[date] = mapped_column(Date)
    date_fin: Mapped[date] = mapped_column(Date)
