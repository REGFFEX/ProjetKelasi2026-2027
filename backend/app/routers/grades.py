from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.authz import assert_teacher_scope, write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.operations import Assessment, EvaluationType, Grade
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.grades import (
    AssessmentCreate,
    AssessmentOut,
    EvaluationTypeCreate,
    EvaluationTypeOut,
    GradeOut,
    GradeUpsert,
)

router = APIRouter(tags=["grades"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.teacher)
WRITE_ROLES = (Role.school_admin, Role.teacher)


@router.get("/evaluation-types")
def list_evaluation_types(
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)
):
    rows = db.query(EvaluationType).filter(EvaluationType.school_id == current_user.school_id).all()
    return envelope([EvaluationTypeOut.model_validate(r).model_dump() for r in rows])


@router.post("/evaluation-types")
def create_evaluation_type(
    body: EvaluationTypeCreate,
    current_user: CurrentUser = Depends(require_role(Role.school_admin)),
    db: Session = Depends(get_db),
):
    row = EvaluationType(school_id=current_user.school_id, nom=body.nom)
    db.add(row)
    db.commit()
    db.refresh(row)
    return envelope(EvaluationTypeOut.model_validate(row).model_dump(), "Type d'évaluation créé.")


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
    assert_teacher_scope(db, current_user, body.classroom_id, body.subject_id)
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
    # Verify assignment scope once per distinct assessment referenced in this batch.
    assessment_cache: dict[str, Assessment] = {}
    for record in body.records:
        if record.assessment_id not in assessment_cache:
            assessment = db.get(Assessment, record.assessment_id)
            if not assessment or assessment.school_id != current_user.school_id:
                raise APIException(404, "Évaluation introuvable.")
            assert_teacher_scope(db, current_user, assessment.classroom_id, assessment.subject_id)
            assessment_cache[record.assessment_id] = assessment

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
            old_note = existing.note
            existing.note = record.note
            existing.appreciation = record.appreciation
            existing.statut_validation = record.statut_validation
            write_audit_log(
                db, current_user, "UPDATE_GRADE", "grade", existing.id,
                old_value={"note": float(old_note) if old_note is not None else None},
                new_value={"note": record.note},
            )
            row = existing
        else:
            row = Grade(
                school_id=current_user.school_id,
                assessment_id=record.assessment_id,
                student_id=record.student_id,
                note=record.note,
                appreciation=record.appreciation,
                statut_validation=record.statut_validation,
            )
            db.add(row)
            db.flush()
            write_audit_log(db, current_user, "CREATE_GRADE", "grade", row.id, new_value={"note": record.note})
        result.append(row)
    db.commit()
    for row in result:
        db.refresh(row)
    return envelope([GradeOut.model_validate(r).model_dump() for r in result], "Notes enregistrées.")
