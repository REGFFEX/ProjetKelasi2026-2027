from datetime import date

from pydantic import BaseModel, Field

from app.models.operations import GradeStatus


class AssessmentCreate(BaseModel):
    subject_id: str
    classroom_id: str
    term_id: str
    libelle: str
    date: date
    coefficient: int = 1


class AssessmentOut(BaseModel):
    id: str
    school_id: str
    subject_id: str
    classroom_id: str
    term_id: str
    libelle: str
    date: date
    coefficient: int

    model_config = {"from_attributes": True}


class GradeRecord(BaseModel):
    assessment_id: str
    student_id: str
    note: float = Field(ge=0, le=20)
    statut_validation: GradeStatus = GradeStatus.brouillon


class GradeUpsert(BaseModel):
    records: list[GradeRecord]


class GradeOut(BaseModel):
    id: str
    school_id: str
    assessment_id: str
    student_id: str
    note: float
    statut_validation: GradeStatus

    model_config = {"from_attributes": True}
