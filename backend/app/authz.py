import json
from typing import Any

from sqlalchemy.orm import Session

from app.deps import CurrentUser
from app.models.academic import AcademicYear, AcademicYearStatus
from app.models.audit import AuditLog
from app.models.people import Enrollment, Teacher, TeacherAssignment, Parent
from app.models.user import Role
from app.response import APIException


def get_active_academic_year_or_none(db: Session, school_id: str) -> AcademicYear | None:
    return (
        db.query(AcademicYear)
        .filter(AcademicYear.school_id == school_id, AcademicYear.statut == AcademicYearStatus.active)
        .first()
    )


def get_active_academic_year(db: Session, school_id: str) -> AcademicYear:
    year = get_active_academic_year_or_none(db, school_id)
    if not year:
        raise APIException(409, "Aucune année scolaire active pour cette école.")
    return year


def get_teacher_row(db: Session, current_user: CurrentUser) -> Teacher:
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise APIException(403, "Aucun profil enseignant associé à ce compte.")
    return teacher


def get_parent_row(db: Session, current_user: CurrentUser) -> Parent:
    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        raise APIException(403, "Aucun profil parent associé à ce compte.")
    return parent


def get_teacher_classroom_ids(db: Session, current_user: CurrentUser) -> set[str]:
    """Classrooms this teacher is actually assigned to in the active academic year —
    used to scope *reads* the same way assert_teacher_scope already scopes writes."""
    year = get_active_academic_year_or_none(db, current_user.school_id)
    if not year:
        return set()
    teacher = get_teacher_row(db, current_user)
    rows = (
        db.query(TeacherAssignment.classroom_id)
        .filter(TeacherAssignment.teacher_id == teacher.id, TeacherAssignment.academic_year_id == year.id)
        .all()
    )
    return {r[0] for r in rows}


def get_teacher_student_ids(db: Session, current_user: CurrentUser) -> set[str]:
    """Students actually enrolled (active year) in one of this teacher's assigned
    classrooms — used to scope /students and /parents reads the same way."""
    classroom_ids = get_teacher_classroom_ids(db, current_user)
    if not classroom_ids:
        return set()
    year = get_active_academic_year_or_none(db, current_user.school_id)
    if not year:
        return set()
    rows = (
        db.query(Enrollment.student_id)
        .filter(Enrollment.classroom_id.in_(classroom_ids), Enrollment.academic_year_id == year.id)
        .all()
    )
    return {r[0] for r in rows}


def assert_teacher_scope(
    db: Session, current_user: CurrentUser, classroom_id: str, subject_id: str | None = None
) -> None:
    """Permission = rôle + périmètre + affectation. school_admin bypasses; teacher must have
    a TeacherAssignment row for this classroom (and subject, if given) in the active year."""
    if current_user.role == Role.school_admin:
        return
    if current_user.role != Role.teacher:
        raise APIException(403, "Permission refusée pour ce rôle.")

    year = get_active_academic_year(db, current_user.school_id)
    teacher = get_teacher_row(db, current_user)

    query = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == teacher.id,
        TeacherAssignment.classroom_id == classroom_id,
        TeacherAssignment.academic_year_id == year.id,
    )
    if subject_id:
        query = query.filter(TeacherAssignment.subject_id == subject_id)

    if not query.first():
        raise APIException(403, "Vous n'êtes pas affecté à cette classe/matière pour l'année en cours.")


def write_audit_log(
    db: Session,
    current_user: CurrentUser,
    action: str,
    entity_type: str,
    entity_id: str,
    old_value: Any = None,
    new_value: Any = None,
) -> None:
    db.add(
        AuditLog(
            school_id=current_user.school_id,
            user_id=current_user.id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=json.dumps(old_value, default=str) if old_value is not None else None,
            new_value=json.dumps(new_value, default=str) if new_value is not None else None,
        )
    )
