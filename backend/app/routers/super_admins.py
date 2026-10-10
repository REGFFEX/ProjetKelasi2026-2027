from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.user import Role, User, UserStatus
from app.response import envelope, APIException
from app.schemas.auth import UserOut
from app.schemas.users import PasswordReset, SuperAdminCreate, SuperAdminUpdate
from app.security import hash_password

router = APIRouter(prefix="/admin/super-admins", tags=["admin-super-admins"])


def _get_super_admin(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user or user.role != Role.super_admin:
        raise APIException(404, "Administrateur introuvable.")
    return user


@router.get("")
def list_super_admins(
    current_user: CurrentUser = Depends(require_role(Role.super_admin)), db: Session = Depends(get_db)
):
    rows = db.query(User).filter(User.role == Role.super_admin).order_by(User.nom).all()
    return envelope([UserOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_super_admin(
    body: SuperAdminCreate,
    current_user: CurrentUser = Depends(require_role(Role.super_admin)),
    db: Session = Depends(get_db),
):
    # Platform accounts (school_id NULL) aren't covered by the per-school unique constraint.
    if db.query(User).filter(User.email == body.email).first():
        raise APIException(409, "Un compte utilise déjà cet email sur la plateforme.")

    user = User(
        school_id=None,
        nom=body.nom,
        email=body.email,
        password_hash=hash_password(body.password),
        telephone=body.telephone,
        role=Role.super_admin,
        statut=UserStatus.actif,
    )
    db.add(user)
    db.flush()
    write_audit_log(db, current_user, "CREATE_SUPER_ADMIN", "user", user.id, new_value={"email": user.email})
    db.commit()
    db.refresh(user)
    return envelope(UserOut.model_validate(user).model_dump(), "Administrateur créé.")


@router.patch("/{user_id}")
def update_super_admin(
    user_id: str,
    body: SuperAdminUpdate,
    current_user: CurrentUser = Depends(require_role(Role.super_admin)),
    db: Session = Depends(get_db),
):
    user = _get_super_admin(db, user_id)
    updates = body.model_dump(exclude_unset=True)

    if "statut" in updates and updates["statut"] != user.statut:
        if updates["statut"] == UserStatus.inactif:
            active_count = (
                db.query(User).filter(User.role == Role.super_admin, User.statut == UserStatus.actif).count()
            )
            if active_count <= 1:
                raise APIException(400, "Impossible de désactiver le dernier administrateur actif.")
        action = "ACTIVATE_USER" if updates["statut"] == UserStatus.actif else "DEACTIVATE_USER"
        write_audit_log(db, current_user, action, "user", user.id,
                         old_value={"statut": user.statut.value}, new_value={"statut": updates["statut"].value})

    for field, value in updates.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return envelope(UserOut.model_validate(user).model_dump(), "Administrateur mis à jour.")


@router.post("/{user_id}/reset-password")
def reset_super_admin_password(
    user_id: str,
    body: PasswordReset,
    current_user: CurrentUser = Depends(require_role(Role.super_admin)),
    db: Session = Depends(get_db),
):
    user = _get_super_admin(db, user_id)
    user.password_hash = hash_password(body.new_password)
    write_audit_log(db, current_user, "RESET_PASSWORD", "user", user.id)
    db.commit()
    return envelope(None, "Mot de passe réinitialisé.")
