import enum
from datetime import date

from sqlalchemy import String, Date, Integer, ForeignKey, CHAR, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPKMixin, TimestampMixin
from app.models.user import UserStatus


class Subject(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subjects"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    nom: Mapped[str] = mapped_column(String(255))
    coefficient: Mapped[int] = mapped_column(Integer, default=1)


class Teacher(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "teachers"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str | None] = mapped_column(
        CHAR(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    nom: Mapped[str] = mapped_column(String(255))
    prenom: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    telephone: Mapped[str] = mapped_column(String(50), default="")
    statut: Mapped[UserStatus] = mapped_column(SAEnum(UserStatus), default=UserStatus.actif)


class Classroom(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "classrooms"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    level_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("levels.id", ondelete="RESTRICT"), index=True)
    nom: Mapped[str] = mapped_column(String(255))
    salle: Mapped[str] = mapped_column(String(100), default="")
    filiere: Mapped[str | None] = mapped_column(String(100), nullable=True)
    enseignant_principal_id: Mapped[str | None] = mapped_column(
        CHAR(36), ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )


class TeacherAssignment(Base, UUIDPKMixin, TimestampMixin):
    """The central scoping entity: Jean enseigne Maths en 5e A pour 2026-2027."""

    __tablename__ = "teacher_assignments"
    __table_args__ = (
        UniqueConstraint(
            "teacher_id", "subject_id", "classroom_id", "academic_year_id", name="uq_teacher_assignment"
        ),
    )

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    teacher_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("teachers.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True)
    classroom_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("classrooms.id", ondelete="CASCADE"), index=True)
    academic_year_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True
    )


class Student(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "students"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    matricule: Mapped[str] = mapped_column(String(50))
    nom: Mapped[str] = mapped_column(String(255))
    prenom: Mapped[str] = mapped_column(String(255))
    date_naissance: Mapped[date] = mapped_column(Date)
    photo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    statut: Mapped[UserStatus] = mapped_column(SAEnum(UserStatus), default=UserStatus.actif)


class EnrollmentStatus(str, enum.Enum):
    active = "active"
    archivee = "archivee"


class Enrollment(Base, UUIDPKMixin, TimestampMixin):
    """A student's classroom membership, scoped to one academic year."""

    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("student_id", "academic_year_id", name="uq_enrollment_student_year"),)

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("students.id", ondelete="CASCADE"), index=True)
    classroom_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("classrooms.id", ondelete="CASCADE"), index=True)
    academic_year_id: Mapped[str] = mapped_column(
        CHAR(36), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True
    )
    statut: Mapped[EnrollmentStatus] = mapped_column(SAEnum(EnrollmentStatus), default=EnrollmentStatus.active)


class Parent(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "parents"

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str | None] = mapped_column(
        CHAR(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    nom: Mapped[str] = mapped_column(String(255))
    telephone: Mapped[str] = mapped_column(String(50), default="")
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    adresse: Mapped[str] = mapped_column(String(500), default="")
    profession: Mapped[str] = mapped_column(String(255), default="")


class StudentParent(Base, UUIDPKMixin):
    __tablename__ = "student_parents"
    __table_args__ = (UniqueConstraint("student_id", "parent_id", name="uq_student_parent"),)

    school_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("students.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("parents.id", ondelete="CASCADE"), index=True)
