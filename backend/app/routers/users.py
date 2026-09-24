from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import write_audit_log
from app.db import get_db
from app.deps import CurrentUser, get_current_user, require_role
from app.models.people import Teacher, Parent
from app.models.user import Role, User, UserStatus
from app.response import envelope, APIException
from app.schemas.auth import UserOut
from app.schemas.users import PasswordReset, UserCreate, UserUpdate
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])

# Roles a school_admin may create/manage from the centralized Users panel.
# super_admin accounts are platform-level and never created here.
ADMIN_MANAGEABLE_ROLES = {Role.school_admin, Role.secretary, Role.accountant, Role.teacher, Role.parent}


def _get_scoped(db: Session, current_user: CurrentUser, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user or user.school_id != current_user.school_id:
        raise APIException(404, "Utilisateur introuvable.")
    return user


@router.get("")
def list_users(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(User).filter(User.school_id == current_user.school_id).order_by(User.nom).all()
    return envelope([UserOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_user(
    body: UserCreate,
    current_user: CurrentUser = Depends(require_role(Role.school_admin)),
    db: Session = Depends(get_db),
):
    if body.role not in ADMIN_MANAGEABLE_ROLES:
        raise APIException(403, "Ce rôle ne peut pas être créé depuis ce panneau.")
    if db.query(User).filter(User.email == body.email).first():
        raise APIException(409, "Un compte utilise déjà cet email sur la plateforme. Choisissez une autre adresse.")

    user = User(
        school_id=current_user.school_id,
        nom=body.nom,
        email=body.email,
        password_hash=hash_password(body.password),
        telephone=body.telephone,
        role=body.role,
        statut=UserStatus.actif,
    )
    db.add(user)
    db.flush()

    # Teacher/parent logins need a linked directory profile to be functional
    # (grades/attendance scoping and the parent portal both look up that row).
    if body.role == Role.teacher:
        db.add(Teacher(
            school_id=current_user.school_id, user_id=user.id,
            nom=body.nom, prenom="", email=body.email, telephone=body.telephone,
        ))
    elif body.role == Role.parent:
        db.add(Parent(
            school_id=current_user.school_id, user_id=user.id,
            nom=body.nom, telephone=body.telephone, email=body.email,
        ))

    write_audit_log(db, current_user, "CREATE_USER", "user", user.id, new_value={"email": user.email, "role": user.role.value})
    db.commit()
    db.refresh(user)
    return envelope(UserOut.model_validate(user).model_dump(), "Utilisateur créé.")


@router.patch("/{user_id}")
def update_user(
    user_id: str,
    body: UserUpdate,
    current_user: CurrentUser = Depends(require_role(Role.school_admin)),
    db: Session = Depends(get_db),
):
    user = _get_scoped(db, current_user, user_id)
    updates = body.model_dump(exclude_unset=True)

    if "role" in updates and updates["role"] != user.role:
        if user.role in (Role.teacher, Role.parent) or updates["role"] in (Role.teacher, Role.parent):
            raise APIException(
                400, "Le rôle enseignant/parent se gère depuis la page Enseignants/Parents, pas ici."
            )
        write_audit_log(db, current_user, "UPDATE_USER_ROLE", "user", user.id,
                         old_value={"role": user.role.value}, new_value={"role": updates["role"].value})

    if "statut" in updates and updates["statut"] != user.statut:
        action = "ACTIVATE_USER" if updates["statut"] == UserStatus.actif else "DEACTIVATE_USER"
        write_audit_log(db, current_user, action, "user", user.id,
                         old_value={"statut": user.statut.value}, new_value={"statut": updates["statut"].value})

    for field, value in updates.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return envelope(UserOut.model_validate(user).model_dump(), "Utilisateur mis à jour.")


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: str,
    body: PasswordReset,
    current_user: CurrentUser = Depends(require_role(Role.school_admin)),
    db: Session = Depends(get_db),
):
    user = _get_scoped(db, current_user, user_id)
    user.password_hash = hash_password(body.new_password)
    write_audit_log(db, current_user, "RESET_PASSWORD", "user", user.id)
    db.commit()
    return envelope(None, "Mot de passe réinitialisé.")
