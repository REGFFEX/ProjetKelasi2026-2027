from datetime import date, datetime

from pydantic import BaseModel

from app.models.user import UserStatus


class StudentCreate(BaseModel):
    matricule: str
    nom: str
    prenom: str
    date_naissance: date
    classroom_id: str | None = None
    statut: UserStatus = UserStatus.actif


class StudentUpdate(BaseModel):
    matricule: str | None = None
    nom: str | None = None
    prenom: str | None = None
    date_naissance: date | None = None
    classroom_id: str | None = None
    statut: UserStatus | None = None


class StudentOut(BaseModel):
    id: str
    school_id: str
    matricule: str
    nom: str
    prenom: str
    date_naissance: date
    photo: str | None = None
    classroom_id: str | None = None
    statut: UserStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentParentsSet(BaseModel):
    parent_ids: list[str]
