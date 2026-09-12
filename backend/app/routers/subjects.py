from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.people import Subject
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.classrooms import SubjectCreate, SubjectUpdate, SubjectOut

router = APIRouter(prefix="/subjects", tags=["subjects"])

# Deliberately not scoped to the teacher's own assignments like /classrooms is: a
# subject's name/coefficient is curriculum metadata, not privacy-sensitive, and other
# screens (e.g. a student's grade history) need to resolve subject names outside the
# viewing teacher's own subjects. The "Matières" tab narrows what's shown to a teacher
# on the frontend instead — see app/classes/classes-content.tsx.
READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher, Role.parent)
WRITE_ROLES = (Role.school_admin, Role.secretary)


@router.get("")
def list_subjects(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    rows = db.query(Subject).filter(Subject.school_id == current_user.school_id).order_by(Subject.nom).all()
    return envelope([SubjectOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_subject(
    body: SubjectCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = Subject(school_id=current_user.school_id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return envelope(SubjectOut.model_validate(row).model_dump(), "Matière créée.")


@router.patch("/{subject_id}")
def update_subject(
    subject_id: str,
    body: SubjectUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = _get_scoped(db, current_user, subject_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return envelope(SubjectOut.model_validate(row).model_dump(), "Matière mise à jour.")


@router.delete("/{subject_id}")
def delete_subject(
    subject_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = _get_scoped(db, current_user, subject_id)
    db.delete(row)
    db.commit()
    return envelope(None, "Matière supprimée.")


def _get_scoped(db: Session, current_user: CurrentUser, subject_id: str) -> Subject:
    row = db.get(Subject, subject_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Matière introuvable.")
    return row
