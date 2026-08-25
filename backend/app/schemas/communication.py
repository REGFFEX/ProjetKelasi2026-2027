from datetime import datetime

from pydantic import BaseModel

from app.models.communication import AnnouncementTarget


class AnnouncementCreate(BaseModel):
    titre: str
    contenu: str
    cible: AnnouncementTarget = AnnouncementTarget.tous


class AnnouncementOut(BaseModel):
    id: str
    school_id: str
    auteur_id: str | None
    auteur_nom: str
    cible: AnnouncementTarget
    titre: str
    contenu: str
    date_publication: datetime
