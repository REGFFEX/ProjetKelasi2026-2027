import enum
from datetime import date

from sqlalchemy import String, Date, Integer, Boolean, ForeignKey, CHAR
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


class EvaluationMode(str, enum.Enum):
    notes = "notes"
    qualitatif = "qualitatif"


class Cycle(Base, UUIDPKMixin, TimestampMixin):
    """École → Cycle (Préscolaire/Primaire/Collège/Lycée) — configurable per school."""

    __tablename__ = "cycles"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    nom: Mapped[str] = mapped_column(String(100))
    ordre: Mapped[int] = mapped_column(Integer, default=0)
    evaluation_mode: Mapped[EvaluationMode] = mapped_column(SAEnum(EvaluationMode), default=EvaluationMode.notes)
    # Enseignants payés à l'heure sur ce cycle (typiquement collège/lycée, vacataires) —
    # active le suivi des séances (démarrer/terminer) et le rapport d'heures.
    paiement_horaire: Mapped[bool] = mapped_column(Boolean, default=False)


class Level(Base, UUIDPKMixin, TimestampMixin):
    """Cycle → Niveau (CP, 6e, Terminale...) — configurable per school."""

    __tablename__ = "levels"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    cycle_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("cycles.id", ondelete="CASCADE"), index=True)
    nom: Mapped[str] = mapped_column(String(100))
    ordre: Mapped[int] = mapped_column(Integer, default=0)
