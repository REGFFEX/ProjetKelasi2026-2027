from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.academic import Cycle
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.academic import CycleCreate, CycleUpdate, CycleOut

router = APIRouter(prefix="/cycles", tags=["cycles"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin, Role.secretary)


@router.get("")
def list_cycles(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    rows = db.query(Cycle).filter(Cycle.school_id == current_user.school_id).order_by(Cycle.ordre).all()
    return envelope([CycleOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_cycle(
    body: CycleCreate, current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)), db: Session = Depends(get_db)
):
    row = Cycle(school_id=current_user.school_id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return envelope(CycleOut.model_validate(row).model_dump(), "Cycle créé.")


@router.patch("/{cycle_id}")
def update_cycle(
    cycle_id: str,
    body: CycleUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = _get_scoped(db, current_user, cycle_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return envelope(CycleOut.model_validate(row).model_dump(), "Cycle mis à jour.")


@router.delete("/{cycle_id}")
def delete_cycle(
    cycle_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = _get_scoped(db, current_user, cycle_id)
    db.delete(row)
    db.commit()
    return envelope(None, "Cycle supprimé.")


def _get_scoped(db: Session, current_user: CurrentUser, cycle_id: str) -> Cycle:
    row = db.get(Cycle, cycle_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Cycle introuvable.")
    return row
