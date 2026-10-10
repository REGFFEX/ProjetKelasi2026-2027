from pydantic import BaseModel, EmailStr

from app.models.user import Role, UserStatus


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    # None = platform login (super_admin, no tenant). A value scopes the lookup to that school.
    school_id: str | None = None


class UserOut(BaseModel):
    id: str
    school_id: str | None
    nom: str
    email: str
    telephone: str
    role: Role
    statut: UserStatus
    avatar_url: str | None = None

    model_config = {"from_attributes": True}
