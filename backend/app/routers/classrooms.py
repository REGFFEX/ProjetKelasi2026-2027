from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.people import Classroom
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.classrooms import ClassroomCreate, ClassroomUpdate, ClassroomOut

router = APIRouter(prefix="/classrooms", tags=["classrooms"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher, Role.parent)
WRITE_ROLES = (Role.school_admin,)


@router.get("")
def list_classrooms(
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)
):
    rows = db.query(Classroom).filter(Classroom.school_id == current_user.school_id).order_by(Classroom.nom).all()
    return envelope([ClassroomOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_classroom(
    body: ClassroomCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = Classroom(school_id=current_user.school_id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return envelope(ClassroomOut.model_validate(row).model_dump(), "Classe créée.")


@router.patch("/{classroom_id}")
def update_classroom(
    classroom_id: str,
    body: ClassroomUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = _get_scoped(db, current_user, classroom_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return envelope(ClassroomOut.model_validate(row).model_dump(), "Classe mise à jour.")


@router.delete("/{classroom_id}")
def delete_classroom(
    classroom_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = _get_scoped(db, current_user, classroom_id)
    db.delete(row)
    db.commit()
    return envelope(None, "Classe supprimée.")


def _get_scoped(db: Session, current_user: CurrentUser, classroom_id: str) -> Classroom:
    row = db.get(Classroom, classroom_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Classe introuvable.")
    return row
