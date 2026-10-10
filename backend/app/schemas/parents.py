from pydantic import BaseModel


class ParentCreate(BaseModel):
    nom: str
    telephone: str = ""
    email: str | None = None
    adresse: str = ""
    profession: str = ""
    # Optional: also provision a login account for this parent (requires email above).
    password: str | None = None


class ParentUpdate(BaseModel):
    nom: str | None = None
    telephone: str | None = None
    email: str | None = None
    adresse: str | None = None
    profession: str | None = None
    # Set to grant/reset this parent's login password (creates the account if none exists yet).
    password: str | None = None


class ParentOut(BaseModel):
    id: str
    school_id: str
    user_id: str | None = None
    nom: str
    telephone: str
    email: str | None = None
    adresse: str
    profession: str

    model_config = {"from_attributes": True}
