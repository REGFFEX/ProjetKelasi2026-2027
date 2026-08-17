from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import get_active_academic_year, write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.people import TeacherAssignment
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.assignments import TeacherAssignmentCreate, TeacherAssignmentOut

router = APIRouter(prefix="/assignments", tags=["assignments"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin,)


@router.get("")
def list_assignments(
    teacher_id: str | None = None,
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    query = db.query(TeacherAssignment).filter(TeacherAssignment.school_id == current_user.school_id)
    if teacher_id:
        query = query.filter(TeacherAssignment.teacher_id == teacher_id)
    rows = query.all()
    return envelope([TeacherAssignmentOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_assignment(
    body: TeacherAssignmentCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    year_id = body.academic_year_id or get_active_academic_year(db, current_user.school_id).id
    row = TeacherAssignment(
        school_id=current_user.school_id,
        teacher_id=body.teacher_id,
        subject_id=body.subject_id,
        classroom_id=body.classroom_id,
        academic_year_id=year_id,
    )
    db.add(row)
    db.flush()
    write_audit_log(
        db,
        current_user,
        "CREATE_ASSIGNMENT",
        "teacher_assignment",
        row.id,
        new_value={"teacher_id": row.teacher_id, "subject_id": row.subject_id, "classroom_id": row.classroom_id},
    )
    db.commit()
    db.refresh(row)
    return envelope(TeacherAssignmentOut.model_validate(row).model_dump(), "Affectation créée.")


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = db.get(TeacherAssignment, assignment_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Affectation introuvable.")
    write_audit_log(
        db,
        current_user,
        "DELETE_ASSIGNMENT",
        "teacher_assignment",
        row.id,
        old_value={"teacher_id": row.teacher_id, "subject_id": row.subject_id, "classroom_id": row.classroom_id},
    )
    db.delete(row)
    db.commit()
    return envelope(None, "Affectation supprimée.")
