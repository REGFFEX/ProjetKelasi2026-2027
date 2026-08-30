from datetime import date, datetime

from pydantic import BaseModel

from app.models.operations import TeachingSessionStatus


class HourlyRateUpsert(BaseModel):
    teacher_id: str
    academic_year_id: str | None = None  # defaults to the active year
    taux: float


class HourlyRateOut(BaseModel):
    id: str
    school_id: str
    teacher_id: str
    academic_year_id: str
    taux: float

    model_config = {"from_attributes": True}


class TeachingSessionStart(BaseModel):
    timetable_slot_id: str


class TeachingSessionOut(BaseModel):
    id: str
    school_id: str
    timetable_slot_id: str
    date: date
    started_at: datetime
    ended_at: datetime | None = None
    duree_reelle: int | None = None
    statut: TeachingSessionStatus

    model_config = {"from_attributes": True}


class TeacherHoursReportRow(BaseModel):
    teacher_id: str
    nom: str
    prenom: str
    nb_seances: int
    total_heures: float
    taux: float
    montant: float


class TeacherHoursReport(BaseModel):
    mois: int
    annee: int
    lignes: list[TeacherHoursReportRow]
    total_heures: float
    total_montant: float
