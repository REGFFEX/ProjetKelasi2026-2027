from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models.user import User, Role
from app.response import APIException
from app.security import decode_access_token


@dataclass
class CurrentUser:
    id: str
    school_id: str | None
    role: Role
    email: str
    nom: str


def get_current_user(request: Request, db: Session = Depends(get_db)) -> CurrentUser:
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise APIException(401, "Non authentifié.")

    payload = decode_access_token(token)
    if not payload:
        raise APIException(401, "Session invalide ou expirée.")

    user = db.get(User, payload.get("sub"))
    if not user or user.statut.value != "actif":
        raise APIException(401, "Utilisateur introuvable ou inactif.")

    return CurrentUser(
        id=user.id, school_id=user.school_id, role=user.role, email=user.email, nom=user.nom
    )


def require_role(*roles: Role):
    def dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in roles:
            raise APIException(403, "Permission refusée pour ce rôle.")
        return current_user

    return dependency


def require_school(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current_user.role != Role.super_admin and not current_user.school_id:
        raise APIException(403, "Aucune école associée à ce compte.")
    return current_user
