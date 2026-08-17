from pydantic import BaseModel, EmailStr, Field

from app.models.user import Role, UserStatus


class UserCreate(BaseModel):
    nom: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    telephone: str = ""
    role: Role


class UserUpdate(BaseModel):
    nom: str | None = None
    telephone: str | None = None
    role: Role | None = None
    statut: UserStatus | None = None


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=6)
