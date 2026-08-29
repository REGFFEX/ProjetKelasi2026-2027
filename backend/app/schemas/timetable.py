from datetime import time

from pydantic import BaseModel

from app.models.operations import Weekday


class TimetableSlotCreate(BaseModel):
    assignment_id: str
    jour: Weekday
    heure_debut: time
    heure_fin: time
    salle: str | None = None


class TimetableSlotUpdate(BaseModel):
    assignment_id: str | None = None
    jour: Weekday | None = None
    heure_debut: time | None = None
    heure_fin: time | None = None
    salle: str | None = None


class TimetableSlotOut(BaseModel):
    id: str
    school_id: str
    assignment_id: str
    jour: Weekday
    heure_debut: time
    heure_fin: time
    salle: str | None = None

    model_config = {"from_attributes": True}
