from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.academic import Level
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.academic import LevelCreate, LevelUpdate, LevelOut

router = APIRouter(prefix="/levels", tags=["levels"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin,)


@router.get("")
def list_levels(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    rows = db.query(Level).filter(Level.school_id == current_user.school_id).order_by(Level.ordre).all()
    return envelope([LevelOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_level(
    body: LevelCreate, current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)), db: Session = Depends(get_db)
):
    row = Level(school_id=current_user.school_id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return envelope(LevelOut.model_validate(row).model_dump(), "Niveau créé.")


@router.patch("/{level_id}")
def update_level(
    level_id: str,
    body: LevelUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = _get_scoped(db, current_user, level_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return envelope(LevelOut.model_validate(row).model_dump(), "Niveau mis à jour.")


@router.delete("/{level_id}")
def delete_level(
    level_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = _get_scoped(db, current_user, level_id)
    db.delete(row)
    db.commit()
    return envelope(None, "Niveau supprimé.")


def _get_scoped(db: Session, current_user: CurrentUser, level_id: str) -> Level:
    row = db.get(Level, level_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Niveau introuvable.")
    return row
