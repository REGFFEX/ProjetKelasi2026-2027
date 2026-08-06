from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.people import Parent
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.parents import ParentCreate, ParentUpdate, ParentOut

router = APIRouter(prefix="/parents", tags=["parents"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin, Role.secretary)


@router.get("")
def list_parents(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    parents = db.query(Parent).filter(Parent.school_id == current_user.school_id).order_by(Parent.nom).all()
    return envelope([ParentOut.model_validate(p).model_dump() for p in parents])


@router.post("")
def create_parent(
    body: ParentCreate, current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)), db: Session = Depends(get_db)
):
    parent = Parent(school_id=current_user.school_id, **body.model_dump())
    db.add(parent)
    db.commit()
    db.refresh(parent)
    return envelope(ParentOut.model_validate(parent).model_dump(), "Parent créé.")


@router.patch("/{parent_id}")
def update_parent(
    parent_id: str,
    body: ParentUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    parent = _get_scoped(db, current_user, parent_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(parent, field, value)
    db.commit()
    db.refresh(parent)
    return envelope(ParentOut.model_validate(parent).model_dump(), "Parent mis à jour.")


@router.delete("/{parent_id}")
def delete_parent(
    parent_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    parent = _get_scoped(db, current_user, parent_id)
    db.delete(parent)
    db.commit()
    return envelope(None, "Parent supprimé.")


def _get_scoped(db: Session, current_user: CurrentUser, parent_id: str) -> Parent:
    parent = db.get(Parent, parent_id)
    if not parent or parent.school_id != current_user.school_id:
        raise APIException(404, "Parent introuvable.")
    return parent
