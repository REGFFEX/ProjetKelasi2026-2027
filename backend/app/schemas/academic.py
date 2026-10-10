from datetime import date

from pydantic import BaseModel

from app.models.academic import AcademicYearStatus, EvaluationMode


class CycleCreate(BaseModel):
    nom: str
    ordre: int = 0
    evaluation_mode: EvaluationMode = EvaluationMode.notes
    paiement_horaire: bool = False
    moyenne_ponderee: bool = True


class CycleUpdate(BaseModel):
    nom: str | None = None
    ordre: int | None = None
    evaluation_mode: EvaluationMode | None = None
    paiement_horaire: bool | None = None
    moyenne_ponderee: bool | None = None


class CycleOut(BaseModel):
    id: str
    school_id: str
    nom: str
    ordre: int
    evaluation_mode: EvaluationMode
    paiement_horaire: bool
    moyenne_ponderee: bool

    model_config = {"from_attributes": True}


class LevelCreate(BaseModel):
    cycle_id: str
    nom: str
    ordre: int = 0


class LevelUpdate(BaseModel):
    cycle_id: str | None = None
    nom: str | None = None
    ordre: int | None = None


class LevelOut(BaseModel):
    id: str
    school_id: str
    cycle_id: str
    nom: str
    ordre: int

    model_config = {"from_attributes": True}


class AcademicYearCreate(BaseModel):
    libelle: str
    date_debut: date
    date_fin: date
    activate: bool = False


class AcademicYearOut(BaseModel):
    id: str
    school_id: str
    libelle: str
    date_debut: date
    date_fin: date
    statut: AcademicYearStatus

    model_config = {"from_attributes": True}


class TermCreate(BaseModel):
    academic_year_id: str
    libelle: str
    date_debut: date
    date_fin: date


class TermOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: str
    libelle: str
    date_debut: date
    date_fin: date

    model_config = {"from_attributes": True}
