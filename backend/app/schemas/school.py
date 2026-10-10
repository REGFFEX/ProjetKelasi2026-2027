from datetime import date

from pydantic import BaseModel

from app.models.school import SubscriptionStatus
from app.models.user import UserStatus


class SchoolAdminCreate(BaseModel):
    nom: str
    adresse: str = ""
    telephone: str = ""
    statut_abonnement: SubscriptionStatus = SubscriptionStatus.essai


class SchoolAdminUpdate(BaseModel):
    nom: str | None = None
    adresse: str | None = None
    telephone: str | None = None
    statut_abonnement: SubscriptionStatus | None = None


class SchoolAdminUserUpdate(BaseModel):
    """What a super_admin may edit about a school's own admin account — not other roles."""
    nom: str | None = None
    telephone: str | None = None
    statut: UserStatus | None = None


class SchoolSelfUpdate(BaseModel):
    """What a school_admin may edit about their own school — subscription status is platform-controlled."""
    nom: str | None = None
    adresse: str | None = None
    telephone: str | None = None
    logo: str | None = None


class SchoolAdminOut(BaseModel):
    id: str
    nom: str
    logo: str | None = None
    adresse: str
    telephone: str
    statut_abonnement: SubscriptionStatus
    date_creation: date
    student_count: int = 0
    user_count: int = 0

    model_config = {"from_attributes": True}
