from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.authz import write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.people import Student
from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.response import envelope, APIException
from app.schemas.auth import UserOut
from app.schemas.school import SchoolAdminCreate, SchoolAdminUpdate, SchoolAdminOut, SchoolAdminUserUpdate
from app.schemas.users import PasswordReset, UserCreate
from app.security import hash_password

router = APIRouter(prefix="/admin/schools", tags=["admin-schools"])


def _serialize(db: Session, school: School) -> dict:
    student_count = db.query(func.count(Student.id)).filter(Student.school_id == school.id).scalar() or 0
    user_count = db.query(func.count(User.id)).filter(User.school_id == school.id).scalar() or 0
    out = SchoolAdminOut(
        id=school.id,
        nom=school.nom,
        logo=school.logo,
        adresse=school.adresse,
        telephone=school.telephone,
        statut_abonnement=school.statut_abonnement,
        date_creation=school.date_creation,
        student_count=student_count,
        user_count=user_count,
    )
    return out.model_dump()


@router.get("")
def list_schools(
    current_user: CurrentUser = Depends(require_role(Role.super_admin)), db: Session = Depends(get_db)
):
    rows = db.query(School).order_by(School.nom).all()
    return envelope([_serialize(db, r) for r in rows])


@router.post("")
def create_school(
    body: SchoolAdminCreate,
    current_user: CurrentUser = Depends(require_role(Role.super_admin)),
    db: Session = Depends(get_db),
):
    school = School(**body.model_dump())
    db.add(school)
    db.flush()
    write_audit_log(db, current_user, "CREATE_SCHOOL", "school", school.id, new_value={"nom": school.nom})
    db.commit()
    db.refresh(school)
    return envelope(_serialize(db, school), "École créée.")


@router.patch("/{school_id}")
def update_school(
    school_id: str,
    body: SchoolAdminUpdate,
    current_user: CurrentUser = Depends(require_role(Role.super_admin)),
    db: Session = Depends(get_db),
):
    school = db.get(School, school_id)
    if not school:
        raise APIException(404, "École introuvable.")
    updates = body.model_dump(exclude_unset=True)
    old_statut = school.statut_abonnement.value
    for field, value in updates.items():
        setattr(school, field, value)
    if "statut_abonnement" in updates and updates["statut_abonnement"] != old_statut:
        write_audit_log(
            db, current_user, "UPDATE_SUBSCRIPTION", "school", school.id,
            old_value={"statut_abonnement": old_statut},
            new_value={"statut_abonnement": school.statut_abonnement.value},
        )
    db.commit()
    db.refresh(school)
    return envelope(_serialize(db, school), "École mise à jour.")


@router.post("/{school_id}/admin")
def create_school_admin(
    school_id: str,
    body: UserCreate,
    current_user: CurrentUser = Depends(require_role(Role.super_admin)),
    db: Session = Depends(get_db),
):
    """Bootstraps the first school_admin login for a newly created school — every other
    account for that school is then created by that admin, not by the platform."""
    school = db.get(School, school_id)
    if not school:
        raise APIException(404, "École introuvable.")
    if db.query(User).filter(User.school_id == school_id, User.email == body.email).first():
        raise APIException(409, "Un compte avec cet email existe déjà dans cette école.")

    user = User(
        school_id=school_id,
        nom=body.nom,
        email=body.email,
        password_hash=hash_password(body.password),
        telephone=body.telephone,
        role=Role.school_admin,
        statut=UserStatus.actif,
    )
    db.add(user)
    db.flush()
    write_audit_log(db, current_user, "CREATE_SCHOOL_ADMIN", "user", user.id, new_value={"email": user.email, "school_id": school_id})
    db.commit()
    db.refresh(user)
    return envelope(UserOut.model_validate(user).model_dump(), "Administrateur créé.")


@router.get("/{school_id}/users")
def list_school_users(
    school_id: str,
    current_user: CurrentUser = Depends(require_role(Role.super_admin)),
    db: Session = Depends(get_db),
):
    """Read-only view of every account in a school — super_admin can see all roles here,
    but can only manage (CRUD) the school's own admin accounts, via the endpoints below."""
    if not db.get(School, school_id):
        raise APIException(404, "École introuvable.")
    rows = db.query(User).filter(User.school_id == school_id).order_by(User.nom).all()
    return envelope([UserOut.model_validate(r).model_dump() for r in rows])


def _get_school_admin_user(db: Session, school_id: str, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user or user.school_id != school_id or user.role != Role.school_admin:
        raise APIException(404, "Administrateur introuvable.")
    return user


@router.patch("/{school_id}/admins/{user_id}")
def update_school_admin_user(
    school_id: str,
    user_id: str,
    body: SchoolAdminUserUpdate,
    current_user: CurrentUser = Depends(require_role(Role.super_admin)),
    db: Session = Depends(get_db),
):
    user = _get_school_admin_user(db, school_id, user_id)
    updates = body.model_dump(exclude_unset=True)

    if "statut" in updates and updates["statut"] == UserStatus.inactif and updates["statut"] != user.statut:
        active_count = (
            db.query(User)
            .filter(User.school_id == school_id, User.role == Role.school_admin, User.statut == UserStatus.actif)
            .count()
        )
        if active_count <= 1:
            raise APIException(400, "Impossible de désactiver le dernier administrateur actif de cette école.")

    if "statut" in updates and updates["statut"] != user.statut:
        action = "ACTIVATE_USER" if updates["statut"] == UserStatus.actif else "DEACTIVATE_USER"
        write_audit_log(db, current_user, action, "user", user.id,
                         old_value={"statut": user.statut.value}, new_value={"statut": updates["statut"].value})

    for field, value in updates.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return envelope(UserOut.model_validate(user).model_dump(), "Administrateur mis à jour.")


@router.post("/{school_id}/admins/{user_id}/reset-password")
def reset_school_admin_password(
    school_id: str,
    user_id: str,
    body: PasswordReset,
    current_user: CurrentUser = Depends(require_role(Role.super_admin)),
    db: Session = Depends(get_db),
):
    user = _get_school_admin_user(db, school_id, user_id)
    user.password_hash = hash_password(body.new_password)
    write_audit_log(db, current_user, "RESET_PASSWORD", "user", user.id)
    db.commit()
    return envelope(None, "Mot de passe réinitialisé.")
