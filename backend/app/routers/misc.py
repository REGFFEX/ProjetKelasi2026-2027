from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.academic import AcademicYear
from app.models.school import School
from app.models.user import User
from app.response import envelope
from app.schemas.auth import UserOut

router = APIRouter(tags=["misc"])


@router.get("/academic-years")
def list_academic_years(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(AcademicYear)
        .filter(AcademicYear.school_id == current_user.school_id)
        .order_by(AcademicYear.date_debut.desc())
        .all()
    )
    return envelope(
        [
            {
                "id": r.id,
                "school_id": r.school_id,
                "libelle": r.libelle,
                "date_debut": r.date_debut.isoformat(),
                "date_fin": r.date_fin.isoformat(),
                "statut": r.statut.value,
            }
            for r in rows
        ]
    )


@router.get("/users")
def list_users(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(User).filter(User.school_id == current_user.school_id).order_by(User.nom).all()
    return envelope([UserOut.model_validate(r).model_dump() for r in rows])


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
