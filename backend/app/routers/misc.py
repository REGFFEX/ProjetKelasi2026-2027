from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import write_audit_log
from app.db import get_db
from app.deps import CurrentUser, get_current_user, require_role
from app.models.school import School
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.school import SchoolSelfUpdate

router = APIRouter(tags=["misc"])


def _serialize_school(school: School) -> dict:
    return {
        "id": school.id,
        "nom": school.nom,
        "logo": school.logo,
        "adresse": school.adresse,
        "telephone": school.telephone,
        "statut_abonnement": school.statut_abonnement.value,
        "date_creation": school.date_creation.isoformat(),
    }


@router.get("/schools/me")
def get_my_school(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    school = db.get(School, current_user.school_id) if current_user.school_id else None
    if not school:
        return envelope(None)
    return envelope(_serialize_school(school))


@router.patch("/schools/me")
def update_my_school(
    body: SchoolSelfUpdate,
    current_user: CurrentUser = Depends(require_role(Role.school_admin)),
    db: Session = Depends(get_db),
):
    school = db.get(School, current_user.school_id) if current_user.school_id else None
    if not school:
        raise APIException(404, "École introuvable.")
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(school, field, value)
    write_audit_log(db, current_user, "UPDATE_SCHOOL", "school", school.id, new_value=updates)
    db.commit()
    db.refresh(school)
    return envelope(_serialize_school(school), "École mise à jour.")
