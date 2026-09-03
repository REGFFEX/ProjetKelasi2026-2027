from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import get_active_academic_year_or_none, write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.people import Teacher, TeacherAssignment
from app.models.user import Role, User, UserStatus
from app.response import envelope, APIException
from app.schemas.teachers import TeacherCreate, TeacherUpdate, TeacherOut
from app.security import hash_password

router = APIRouter(prefix="/teachers", tags=["teachers"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin, Role.secretary)


def _serialize(db: Session, current_user: CurrentUser, teacher: Teacher) -> dict:
    year = get_active_academic_year_or_none(db, current_user.school_id)
    assignments = (
        db.query(TeacherAssignment)
        .filter(TeacherAssignment.teacher_id == teacher.id, TeacherAssignment.academic_year_id == year.id)
        .all()
        if year
        else []
    )
    out = TeacherOut(
        id=teacher.id,
        school_id=teacher.school_id,
        user_id=teacher.user_id,
        nom=teacher.nom,
        prenom=teacher.prenom,
        email=teacher.email,
        telephone=teacher.telephone,
        statut=teacher.statut,
        matiere_ids=sorted({a.subject_id for a in assignments}),
        classroom_ids=sorted({a.classroom_id for a in assignments}),
    )
    return out.model_dump()


def _sync_assignments(db: Session, current_user: CurrentUser, teacher_id: str, pairs: list) -> None:
    year = get_active_academic_year_or_none(db, current_user.school_id)
    if not year:
        raise APIException(409, "Aucune année scolaire active pour cette école.")
    db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == teacher_id, TeacherAssignment.academic_year_id == year.id
    ).delete()
    for pair in pairs:
        db.add(
            TeacherAssignment(
                school_id=current_user.school_id,
                teacher_id=teacher_id,
                subject_id=pair.subject_id,
                classroom_id=pair.classroom_id,
                academic_year_id=year.id,
            )
        )


@router.get("")
def list_teachers(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    rows = db.query(Teacher).filter(Teacher.school_id == current_user.school_id).order_by(Teacher.nom).all()
    return envelope([_serialize(db, current_user, r) for r in rows])


def _provision_login(db: Session, current_user: CurrentUser, teacher: Teacher, password: str) -> None:
    if db.query(User).filter(User.school_id == current_user.school_id, User.email == teacher.email).first():
        raise APIException(409, "Un compte avec cet email existe déjà dans cette école.")
    user = User(
        school_id=current_user.school_id,
        nom=f"{teacher.prenom} {teacher.nom}".strip(),
        email=teacher.email,
        password_hash=hash_password(password),
        telephone=teacher.telephone,
        role=Role.teacher,
        statut=UserStatus.actif,
    )
    db.add(user)
    db.flush()
    teacher.user_id = user.id
    write_audit_log(db, current_user, "CREATE_USER", "user", user.id, new_value={"email": user.email, "role": "teacher"})


@router.post("")
def create_teacher(
    body: TeacherCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude={"assignments", "password"})
    teacher = Teacher(school_id=current_user.school_id, **data)
    db.add(teacher)
    db.flush()
    if body.assignments:
        _sync_assignments(db, current_user, teacher.id, body.assignments)
    if body.password:
        _provision_login(db, current_user, teacher, body.password)
    db.commit()
    db.refresh(teacher)
    return envelope(_serialize(db, current_user, teacher), "Enseignant créé.")


@router.patch("/{teacher_id}")
def update_teacher(
    teacher_id: str,
    body: TeacherUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    teacher = _get_scoped(db, current_user, teacher_id)
    updates = body.model_dump(exclude_unset=True, exclude={"assignments", "password"})
    for field, value in updates.items():
        setattr(teacher, field, value)
    if body.assignments is not None:
        _sync_assignments(db, current_user, teacher.id, body.assignments)
    if body.password:
        if teacher.user_id:
            user = db.get(User, teacher.user_id)
            user.password_hash = hash_password(body.password)
            write_audit_log(db, current_user, "RESET_PASSWORD", "user", user.id)
        else:
            _provision_login(db, current_user, teacher, body.password)
    db.commit()
    db.refresh(teacher)
    return envelope(_serialize(db, current_user, teacher), "Enseignant mis à jour.")


@router.delete("/{teacher_id}")
def delete_teacher(
    teacher_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    teacher = _get_scoped(db, current_user, teacher_id)
    db.delete(teacher)
    db.commit()
    return envelope(None, "Enseignant supprimé.")


def _get_scoped(db: Session, current_user: CurrentUser, teacher_id: str) -> Teacher:
    teacher = db.get(Teacher, teacher_id)
    if not teacher or teacher.school_id != current_user.school_id:
        raise APIException(404, "Enseignant introuvable.")
    return teacher
