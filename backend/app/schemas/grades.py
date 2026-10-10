from datetime import date

from pydantic import BaseModel, Field

from app.models.operations import GradeStatus


class EvaluationTypeCreate(BaseModel):
    nom: str


class EvaluationTypeOut(BaseModel):
    id: str
    school_id: str
    nom: str

    model_config = {"from_attributes": True}


class AssessmentCreate(BaseModel):
    subject_id: str
    classroom_id: str
    term_id: str
    evaluation_type_id: str | None = None
    libelle: str
    date: date
    coefficient: int = 1


class AssessmentOut(BaseModel):
    id: str
    school_id: str
    subject_id: str
    classroom_id: str
    term_id: str
    evaluation_type_id: str | None = None
    libelle: str
    date: date
    coefficient: int

    model_config = {"from_attributes": True}


class GradeRecord(BaseModel):
    assessment_id: str
    student_id: str
    note: float | None = Field(default=None, ge=0, le=20)
    appreciation: str | None = None
    statut_validation: GradeStatus = GradeStatus.brouillon


class GradeUpsert(BaseModel):
    records: list[GradeRecord]


class GradeOut(BaseModel):
    id: str
    school_id: str
    assessment_id: str
    student_id: str
    note: float | None = None
    appreciation: str | None = None
    statut_validation: GradeStatus

    model_config = {"from_attributes": True}
