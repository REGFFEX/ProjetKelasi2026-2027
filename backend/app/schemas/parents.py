from pydantic import BaseModel


class ParentCreate(BaseModel):
    nom: str
    telephone: str = ""
    email: str | None = None
    adresse: str = ""
    profession: str = ""


class ParentUpdate(BaseModel):
    nom: str | None = None
    telephone: str | None = None
    email: str | None = None
    adresse: str | None = None
    profession: str | None = None


class ParentOut(BaseModel):
    id: str
    school_id: str
    nom: str
    telephone: str
    email: str | None = None
    adresse: str
    profession: str

    model_config = {"from_attributes": True}
