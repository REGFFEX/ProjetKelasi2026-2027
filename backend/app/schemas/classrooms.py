from pydantic import BaseModel


class ClassroomCreate(BaseModel):
    level_id: str
    nom: str
    salle: str = ""
    filiere: str | None = None
    enseignant_principal_id: str | None = None


class ClassroomUpdate(BaseModel):
    level_id: str | None = None
    nom: str | None = None
    salle: str | None = None
    filiere: str | None = None
    enseignant_principal_id: str | None = None


class ClassroomOut(BaseModel):
    id: str
    school_id: str
    level_id: str
    nom: str
    salle: str
    filiere: str | None = None
    enseignant_principal_id: str | None = None

    model_config = {"from_attributes": True}


class SubjectCreate(BaseModel):
    nom: str
    coefficient: int = 1


class SubjectUpdate(BaseModel):
    nom: str | None = None
    coefficient: int | None = None


class SubjectOut(BaseModel):
    id: str
    school_id: str
    nom: str
    coefficient: int

    model_config = {"from_attributes": True}
