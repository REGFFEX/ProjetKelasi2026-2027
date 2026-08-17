from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.school import School
from app.response import envelope

router = APIRouter(tags=["misc"])


@router.get("/schools/me")
def get_my_school(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    school = db.get(School, current_user.school_id) if current_user.school_id else None
    if not school:
        return envelope(None)
    return envelope(
        {
            "id": school.id,
            "nom": school.nom,
            "logo": school.logo,
            "adresse": school.adresse,
            "telephone": school.telephone,
            "statut_abonnement": school.statut_abonnement.value,
            "date_creation": school.date_creation.isoformat(),
        }
    )
