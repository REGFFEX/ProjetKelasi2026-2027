import enum
from datetime import date, datetime, time

from sqlalchemy import String, Text, Date, DateTime, Time, Integer, Numeric, ForeignKey, CHAR, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPKMixin, TimestampMixin


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    retard = "retard"
    justifie = "justifie"


class Attendance(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),)

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("students.id", ondelete="CASCADE"), index=True)
    classroom_id: Mapped[str | None] = mapped_column(
        CHAR(36), ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True, index=True
    )
    date: Mapped[date] = mapped_column(Date, index=True)
    statut: Mapped[AttendanceStatus] = mapped_column(SAEnum(AttendanceStatus))


class EvaluationType(Base, UUIDPKMixin, TimestampMixin):
    """Configurable per school: Devoir, Interrogation, Composition, Examen, Projet, Oral, Participation..."""

    __tablename__ = "evaluation_types"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    nom: Mapped[str] = mapped_column(String(100))


class Assessment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "assessments"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True)
    classroom_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("classrooms.id", ondelete="CASCADE"), index=True)
    term_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("terms.id", ondelete="CASCADE"), index=True)
    evaluation_type_id: Mapped[str | None] = mapped_column(
        CHAR(36), ForeignKey("evaluation_types.id", ondelete="SET NULL"), nullable=True
    )
    libelle: Mapped[str] = mapped_column(String(255))
    date: Mapped[date] = mapped_column(Date)
    coefficient: Mapped[int] = mapped_column(Integer, default=1)


class Weekday(str, enum.Enum):
    lundi = "lundi"
    mardi = "mardi"
    mercredi = "mercredi"
    jeudi = "jeudi"
    vendredi = "vendredi"
    samedi = "samedi"


class TimetableSlot(Base, UUIDPKMixin, TimestampMixin):
    """A weekly recurring class slot, tied to an existing teacher×subject×classroom
    assignment rather than duplicating those references — one row per (day, time range)."""

    __tablename__ = "timetable_slots"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    assignment_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("teacher_assignments.id", ondelete="CASCADE"), index=True
    )
    jour: Mapped[Weekday] = mapped_column(SAEnum(Weekday), index=True)
    heure_debut: Mapped[time] = mapped_column(Time)
    heure_fin: Mapped[time] = mapped_column(Time)
    salle: Mapped[str | None] = mapped_column(String(100), nullable=True)


class TeacherHourlyRate(Base, UUIDPKMixin, TimestampMixin):
    """Taux horaire (FC/heure) d'un enseignant pour une année scolaire donnée —
    n'a d'effet que sur les cycles marqués Cycle.paiement_horaire."""

    __tablename__ = "teacher_hourly_rates"
    __table_args__ = (UniqueConstraint("teacher_id", "academic_year_id", name="uq_hourly_rate_teacher_year"),)

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    teacher_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("teachers.id", ondelete="CASCADE"), index=True)
    academic_year_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True
    )
    taux: Mapped[float] = mapped_column(Numeric(10, 2))


class TeachingSessionStatus(str, enum.Enum):
    en_cours = "en_cours"
    termine = "termine"


class TeachingSession(Base, UUIDPKMixin, TimestampMixin):
    """One actual delivery of a TimetableSlot on a given date — started/ended by the
    teacher themselves, duration computed server-side to prevent tampering."""

    __tablename__ = "teaching_sessions"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    timetable_slot_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("timetable_slots.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date] = mapped_column(Date, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duree_reelle: Mapped[int | None] = mapped_column(Integer, nullable=True)
    statut: Mapped[TeachingSessionStatus] = mapped_column(SAEnum(TeachingSessionStatus), default=TeachingSessionStatus.en_cours)


class GradeStatus(str, enum.Enum):
    brouillon = "brouillon"
    valide = "valide"
    publie = "publie"


class Grade(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "grades"
    __table_args__ = (UniqueConstraint("assessment_id", "student_id", name="uq_grade_assessment_student"),)

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    assessment_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("assessments.id", ondelete="CASCADE"), index=True
    )
    student_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("students.id", ondelete="CASCADE"), index=True)
    note: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    appreciation: Mapped[str | None] = mapped_column(Text, nullable=True)
    statut_validation: Mapped[GradeStatus] = mapped_column(SAEnum(GradeStatus), default=GradeStatus.brouillon)
