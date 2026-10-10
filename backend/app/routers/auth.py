from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.school import School
from app.models.user import User, UserStatus
from app.response import envelope, APIException
from app.schemas.auth import LoginRequest, UserOut
from app.security import create_access_token, set_auth_cookie, clear_auth_cookie, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/schools")
def list_schools(db: Session = Depends(get_db)):
    """Public, minimal listing — used by the sidebar to display the current school's name."""
    schools = db.query(School).order_by(School.nom).all()
    return envelope([{"id": s.id, "nom": s.nom} for s in schools])


@router.post("/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    # school_id disambiguates only if the same email exists in more than one tenant —
    # the login form itself just asks for email/password, no tenant picker.
    query = db.query(User).filter(User.email == body.email)
    if body.school_id:
        query = query.filter(User.school_id == body.school_id)
    matches = query.all()
    if len(matches) > 1:
        raise APIException(409, "Plusieurs comptes utilisent cet email. Contactez votre administrateur.")

    user = matches[0] if matches else None
    if not user or not verify_password(body.password, user.password_hash):
        raise APIException(401, "Identifiants incorrects.")
    if user.statut != UserStatus.actif:
        raise APIException(403, "Ce compte est désactivé.")

    token = create_access_token(user.id, user.school_id, user.role.value)
    set_auth_cookie(response, token)
    return envelope(UserOut.model_validate(user).model_dump(), "Connexion réussie.")


@router.get("/me")
def me(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.get(User, current_user.id)
    if not user:
        raise APIException(404, "Utilisateur introuvable.")
    return envelope(UserOut.model_validate(user).model_dump())


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return envelope(None, "Déconnecté.")
