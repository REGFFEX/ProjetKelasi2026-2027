from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.academic import AcademicYear, AcademicYearStatus, Term
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.academic import AcademicYearCreate, AcademicYearOut, TermCreate, TermOut

router = APIRouter(prefix="/academic-years", tags=["academic-years"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin,)


@router.get("")
def list_academic_years(
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)
):
    rows = (
        db.query(AcademicYear)
        .filter(AcademicYear.school_id == current_user.school_id)
        .order_by(AcademicYear.date_debut.desc())
        .all()
    )
    return envelope([AcademicYearOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_academic_year(
    body: AcademicYearCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = AcademicYear(
        school_id=current_user.school_id,
        libelle=body.libelle,
        date_debut=body.date_debut,
        date_fin=body.date_fin,
        statut=AcademicYearStatus.archivee,
    )
    db.add(row)
    db.flush()
    write_audit_log(db, current_user, "CREATE_ACADEMIC_YEAR", "academic_year", row.id, new_value={"libelle": row.libelle})

    if body.activate:
        _activate(db, current_user, row)

    db.commit()
    db.refresh(row)
    return envelope(AcademicYearOut.model_validate(row).model_dump(), "Année scolaire créée.")


@router.post("/{year_id}/activate")
def activate_academic_year(
    year_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = db.get(AcademicYear, year_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Année scolaire introuvable.")
    _activate(db, current_user, row)
    db.commit()
    db.refresh(row)
    return envelope(AcademicYearOut.model_validate(row).model_dump(), "Année scolaire activée.")


def _activate(db: Session, current_user: CurrentUser, year: AcademicYear) -> None:
    """Exactly one active year per school — archive whichever was active before."""
    previous = (
        db.query(AcademicYear)
        .filter(
            AcademicYear.school_id == current_user.school_id,
            AcademicYear.statut == AcademicYearStatus.active,
            AcademicYear.id != year.id,
        )
        .first()
    )
    if previous:
        previous.statut = AcademicYearStatus.archivee
        write_audit_log(db, current_user, "ARCHIVE_ACADEMIC_YEAR", "academic_year", previous.id)
    year.statut = AcademicYearStatus.active
    write_audit_log(db, current_user, "ACTIVATE_ACADEMIC_YEAR", "academic_year", year.id)


@router.get("/terms")
def list_terms(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    rows = (
        db.query(Term).filter(Term.school_id == current_user.school_id).order_by(Term.date_debut.desc()).all()
    )
    return envelope([TermOut.model_validate(r).model_dump() for r in rows])


@router.post("/terms")
def create_term(
    body: TermCreate, current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)), db: Session = Depends(get_db)
):
    row = Term(school_id=current_user.school_id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return envelope(TermOut.model_validate(row).model_dump(), "Période créée.")
