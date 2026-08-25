from sqlalchemy.orm import Session

from app.authz import get_active_academic_year_or_none
from app.models.academic import AcademicYear
from app.models.people import Classroom, Enrollment, Student


def resolve_student_classroom(db: Session, student: Student, school_id: str) -> tuple[Classroom | None, AcademicYear | None]:
    """The student's classroom for the active academic year, if any."""
    year = get_active_academic_year_or_none(db, school_id)
    if not year:
        return None, None
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student.id, Enrollment.academic_year_id == year.id)
        .first()
    )
    classroom = db.get(Classroom, enrollment.classroom_id) if enrollment else None
    return classroom, year
