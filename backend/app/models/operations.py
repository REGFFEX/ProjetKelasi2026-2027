import enum
from datetime import date

from sqlalchemy import String, Date, Integer, Numeric, ForeignKey, CHAR, UniqueConstraint
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


class Assessment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "assessments"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True)
    classroom_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("classrooms.id", ondelete="CASCADE"), index=True)
    term_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("terms.id", ondelete="CASCADE"), index=True)
    libelle: Mapped[str] = mapped_column(String(255))
    date: Mapped[date] = mapped_column(Date)
    coefficient: Mapped[int] = mapped_column(Integer, default=1)


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
    note: Mapped[float] = mapped_column(Numeric(5, 2))
    statut_validation: Mapped[GradeStatus] = mapped_column(SAEnum(GradeStatus), default=GradeStatus.brouillon)
