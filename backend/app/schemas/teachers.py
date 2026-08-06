from pydantic import BaseModel

from app.models.user import UserStatus


class TeacherCreate(BaseModel):
    nom: str
    prenom: str
    email: str
    telephone: str = ""
    statut: UserStatus = UserStatus.actif
    matiere_ids: list[str] = []
    classroom_ids: list[str] = []


class TeacherUpdate(BaseModel):
    nom: str | None = None
    prenom: str | None = None
    email: str | None = None
    telephone: str | None = None
    statut: UserStatus | None = None
    matiere_ids: list[str] | None = None
    classroom_ids: list[str] | None = None


class TeacherOut(BaseModel):
    id: str
    school_id: str
    user_id: str | None = None
    nom: str
    prenom: str
    email: str
    telephone: str
    statut: UserStatus
    matiere_ids: list[str] = []
    classroom_ids: list[str] = []
