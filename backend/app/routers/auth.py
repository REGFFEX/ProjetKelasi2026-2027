from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.school import School
from app.models.user import User, UserStatus
from app.response import envelope, APIException
from app.schemas.auth import LoginRequest, SignupRequest, UserOut
from app.security import create_access_token, hash_password, set_auth_cookie, clear_auth_cookie, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/schools")
def list_schools_for_signup(db: Session = Depends(get_db)):
    """Public, minimal listing so the signup form can offer a school picker."""
    schools = db.query(School).order_by(School.nom).all()
    return envelope([{"id": s.id, "nom": s.nom} for s in schools])


@router.post("/signup")
def signup(body: SignupRequest, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise APIException(409, "Un compte avec cet email existe déjà.")

    school = db.get(School, body.school_id)
    if not school:
        raise APIException(404, "École introuvable.")

    user = User(
        school_id=body.school_id,
        nom=body.nom,
        email=body.email,
        password_hash=hash_password(body.password),
        telephone=body.telephone,
        role=body.role,
        statut=UserStatus.actif,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.school_id, user.role.value)
    set_auth_cookie(response, token)
    return envelope(UserOut.model_validate(user).model_dump(), "Compte créé.")


@router.post("/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
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
