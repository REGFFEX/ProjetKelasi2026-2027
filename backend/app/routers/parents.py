from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import get_teacher_student_ids, write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.people import Parent, StudentParent
from app.models.user import Role, User, UserStatus
from app.response import envelope, APIException
from app.schemas.parents import ParentCreate, ParentUpdate, ParentOut
from app.security import hash_password

router = APIRouter(prefix="/parents", tags=["parents"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin, Role.secretary)


def _provision_login(db: Session, current_user: CurrentUser, parent: Parent, password: str) -> None:
    if not parent.email:
        raise APIException(400, "Un email est requis pour créer un accès de connexion.")
    if db.query(User).filter(User.email == parent.email).first():
        raise APIException(409, "Un compte utilise déjà cet email sur la plateforme. Choisissez une autre adresse.")
    user = User(
        school_id=current_user.school_id,
        nom=parent.nom,
        email=parent.email,
        password_hash=hash_password(password),
        telephone=parent.telephone,
        role=Role.parent,
        statut=UserStatus.actif,
    )
    db.add(user)
    db.flush()
    parent.user_id = user.id
    write_audit_log(db, current_user, "CREATE_USER", "user", user.id, new_value={"email": user.email, "role": "parent"})


@router.get("")
def list_parents(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    query = db.query(Parent).filter(Parent.school_id == current_user.school_id)
    if current_user.role == Role.teacher:
        student_ids = get_teacher_student_ids(db, current_user)
        if not student_ids:
            return envelope([])
        parent_ids = {
            sp.parent_id
            for sp in db.query(StudentParent).filter(StudentParent.student_id.in_(student_ids)).all()
        }
        if not parent_ids:
            return envelope([])
        query = query.filter(Parent.id.in_(parent_ids))
    parents = query.order_by(Parent.nom).all()
    return envelope([ParentOut.model_validate(p).model_dump() for p in parents])


@router.post("")
def create_parent(
    body: ParentCreate, current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)), db: Session = Depends(get_db)
):
    data = body.model_dump(exclude={"password"})
    parent = Parent(school_id=current_user.school_id, **data)
    db.add(parent)
    db.flush()
    if body.password:
        _provision_login(db, current_user, parent, body.password)
    db.commit()
    db.refresh(parent)
    return envelope(ParentOut.model_validate(parent).model_dump(), "Parent créé.")


@router.patch("/{parent_id}")
def update_parent(
    parent_id: str,
    body: ParentUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    parent = _get_scoped(db, current_user, parent_id)
    for field, value in body.model_dump(exclude_unset=True, exclude={"password"}).items():
        setattr(parent, field, value)
    if body.password:
        if parent.user_id:
            user = db.get(User, parent.user_id)
            user.password_hash = hash_password(body.password)
            write_audit_log(db, current_user, "RESET_PASSWORD", "user", user.id)
        else:
            _provision_login(db, current_user, parent, body.password)
    db.commit()
    db.refresh(parent)
    return envelope(ParentOut.model_validate(parent).model_dump(), "Parent mis à jour.")


@router.delete("/{parent_id}")
def delete_parent(
    parent_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    parent = _get_scoped(db, current_user, parent_id)
    db.delete(parent)
    db.commit()
    return envelope(None, "Parent supprimé.")


def _get_scoped(db: Session, current_user: CurrentUser, parent_id: str) -> Parent:
    parent = db.get(Parent, parent_id)
    if not parent or parent.school_id != current_user.school_id:
        raise APIException(404, "Parent introuvable.")
    return parent
