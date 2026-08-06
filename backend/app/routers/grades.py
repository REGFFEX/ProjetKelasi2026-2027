from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.operations import Assessment, Grade
from app.models.user import Role
from app.response import envelope
from app.schemas.grades import AssessmentCreate, AssessmentOut, GradeOut, GradeUpsert

router = APIRouter(tags=["grades"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.teacher)
WRITE_ROLES = (Role.school_admin, Role.teacher)


@router.get("/assessments")
def list_assessments(
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)
):
    rows = (
        db.query(Assessment)
        .filter(Assessment.school_id == current_user.school_id)
        .order_by(Assessment.date.desc())
        .all()
    )
    return envelope([AssessmentOut.model_validate(r).model_dump() for r in rows])


@router.post("/assessments")
def create_assessment(
    body: AssessmentCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = Assessment(school_id=current_user.school_id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return envelope(AssessmentOut.model_validate(row).model_dump(), "Évaluation créée.")


@router.get("/grades")
def list_grades(
    assessment_id: str | None = Query(default=None),
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    query = db.query(Grade).filter(Grade.school_id == current_user.school_id)
    if assessment_id:
        query = query.filter(Grade.assessment_id == assessment_id)
    rows = query.all()
    return envelope([GradeOut.model_validate(r).model_dump() for r in rows])


@router.put("/grades")
def upsert_grades(
    body: GradeUpsert,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    result = []
    for record in body.records:
        existing = (
            db.query(Grade)
            .filter(
                Grade.school_id == current_user.school_id,
                Grade.assessment_id == record.assessment_id,
                Grade.student_id == record.student_id,
            )
            .first()
        )
        if existing:
            existing.note = record.note
            existing.statut_validation = record.statut_validation
            row = existing
        else:
            row = Grade(
                school_id=current_user.school_id,
                assessment_id=record.assessment_id,
                student_id=record.student_id,
                note=record.note,
                statut_validation=record.statut_validation,
            )
            db.add(row)
        result.append(row)
    db.commit()
    for row in result:
        db.refresh(row)
    return envelope([GradeOut.model_validate(r).model_dump() for r in result], "Notes enregistrées.")
