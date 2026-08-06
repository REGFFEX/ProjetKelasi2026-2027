from pydantic import BaseModel, EmailStr, Field

from app.models.user import Role, UserStatus


class SignupRequest(BaseModel):
    nom: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    telephone: str = ""
    role: Role
    school_id: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
