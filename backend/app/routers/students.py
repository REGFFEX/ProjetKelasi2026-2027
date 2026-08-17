from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import get_active_academic_year_or_none
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.people import Student, Parent, StudentParent, Enrollment
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.students import StudentCreate, StudentUpdate, StudentOut, StudentParentsSet
from app.schemas.parents import ParentOut

router = APIRouter(prefix="/students", tags=["students"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin, Role.secretary)


def _current_classroom_id(db: Session, school_id: str, student_id: str) -> str | None:
    year = get_active_academic_year_or_none(db, school_id)
    if not year:
        return None
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student_id, Enrollment.academic_year_id == year.id)
        .first()
    )
    return enrollment.classroom_id if enrollment else None


def _serialize(db: Session, current_user: CurrentUser, student: Student) -> dict:
    out = StudentOut(
        id=student.id,
        school_id=student.school_id,
        matricule=student.matricule,
        nom=student.nom,
        prenom=student.prenom,
        date_naissance=student.date_naissance,
        photo=student.photo,
        classroom_id=_current_classroom_id(db, current_user.school_id, student.id),
        statut=student.statut,
    )
    return out.model_dump()


def _set_enrollment(db: Session, current_user: CurrentUser, student_id: str, classroom_id: str | None) -> None:
    if classroom_id is None:
        return
    year = get_active_academic_year_or_none(db, current_user.school_id)
    if not year:
        raise APIException(409, "Aucune année scolaire active pour cette école.")
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student_id, Enrollment.academic_year_id == year.id)
        .first()
    )
    if enrollment:
        enrollment.classroom_id = classroom_id
    else:
        db.add(
            Enrollment(
                school_id=current_user.school_id,
                student_id=student_id,
                classroom_id=classroom_id,
                academic_year_id=year.id,
            )
        )


@router.get("")
def list_students(
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)
):
    students = (
        db.query(Student).filter(Student.school_id == current_user.school_id).order_by(Student.nom).all()
    )
    return envelope([_serialize(db, current_user, s) for s in students])


@router.get("/parent-links")
def list_all_student_parents(
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)
):
    links = db.query(StudentParent).filter(StudentParent.school_id == current_user.school_id).all()
    return envelope(
        [
            {"id": l.id, "school_id": l.school_id, "student_id": l.student_id, "parent_id": l.parent_id}
            for l in links
        ]
    )


@router.get("/{student_id}")
def get_student(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    return envelope(_serialize(db, current_user, student))


@router.post("")
def create_student(
    body: StudentCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude={"classroom_id"})
    student = Student(school_id=current_user.school_id, **data)
    db.add(student)
    db.flush()
    _set_enrollment(db, current_user, student.id, body.classroom_id)
    db.commit()
    db.refresh(student)
    return envelope(_serialize(db, current_user, student), "Élève créé.")


@router.patch("/{student_id}")
def update_student(
    student_id: str,
    body: StudentUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    updates = body.model_dump(exclude_unset=True, exclude={"classroom_id"})
    for field, value in updates.items():
        setattr(student, field, value)
    if "classroom_id" in body.model_fields_set:
        _set_enrollment(db, current_user, student.id, body.classroom_id)
    db.commit()
    db.refresh(student)
    return envelope(_serialize(db, current_user, student), "Élève mis à jour.")


@router.delete("/{student_id}")
def delete_student(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    db.delete(student)
    db.commit()
    return envelope(None, "Élève supprimé.")


@router.get("/{student_id}/parents")
def get_student_parents(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    _get_scoped(db, current_user, student_id)
    links = db.query(StudentParent).filter(StudentParent.student_id == student_id).all()
    parent_ids = [link.parent_id for link in links]
    parents = db.query(Parent).filter(Parent.id.in_(parent_ids)).all() if parent_ids else []
    return envelope([ParentOut.model_validate(p).model_dump() for p in parents])


@router.put("/{student_id}/parents")
def set_student_parents(
    student_id: str,
    body: StudentParentsSet,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    _get_scoped(db, current_user, student_id)
    db.query(StudentParent).filter(StudentParent.student_id == student_id).delete()
    for parent_id in body.parent_ids:
        db.add(StudentParent(school_id=current_user.school_id, student_id=student_id, parent_id=parent_id))
    db.commit()
    return envelope(None, "Parents liés à l'élève.")


def _get_scoped(db: Session, current_user: CurrentUser, student_id: str) -> Student:
    student = db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise APIException(404, "Élève introuvable.")
    return student
