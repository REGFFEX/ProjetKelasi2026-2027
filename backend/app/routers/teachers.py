from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.people import Teacher, TeacherSubject, TeacherClassroom
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.teachers import TeacherCreate, TeacherUpdate, TeacherOut

router = APIRouter(prefix="/teachers", tags=["teachers"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin,)


def _serialize(db: Session, teacher: Teacher) -> dict:
    matiere_ids = [
        r.subject_id for r in db.query(TeacherSubject).filter(TeacherSubject.teacher_id == teacher.id).all()
    ]
    classroom_ids = [
        r.classroom_id
        for r in db.query(TeacherClassroom).filter(TeacherClassroom.teacher_id == teacher.id).all()
    ]
    out = TeacherOut(
        id=teacher.id,
        school_id=teacher.school_id,
        user_id=teacher.user_id,
        nom=teacher.nom,
        prenom=teacher.prenom,
        email=teacher.email,
        telephone=teacher.telephone,
        statut=teacher.statut,
        matiere_ids=matiere_ids,
        classroom_ids=classroom_ids,
    )
    return out.model_dump()


def _sync_links(db: Session, teacher_id: str, matiere_ids: list[str] | None, classroom_ids: list[str] | None):
    if matiere_ids is not None:
        db.query(TeacherSubject).filter(TeacherSubject.teacher_id == teacher_id).delete()
        for subject_id in matiere_ids:
            db.add(TeacherSubject(teacher_id=teacher_id, subject_id=subject_id))
    if classroom_ids is not None:
        db.query(TeacherClassroom).filter(TeacherClassroom.teacher_id == teacher_id).delete()
        for classroom_id in classroom_ids:
            db.add(TeacherClassroom(teacher_id=teacher_id, classroom_id=classroom_id))


@router.get("")
def list_teachers(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    rows = db.query(Teacher).filter(Teacher.school_id == current_user.school_id).order_by(Teacher.nom).all()
    return envelope([_serialize(db, r) for r in rows])


@router.post("")
def create_teacher(
    body: TeacherCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude={"matiere_ids", "classroom_ids"})
    teacher = Teacher(school_id=current_user.school_id, **data)
    db.add(teacher)
    db.flush()
    _sync_links(db, teacher.id, body.matiere_ids, body.classroom_ids)
    db.commit()
    db.refresh(teacher)
    return envelope(_serialize(db, teacher), "Enseignant créé.")


@router.patch("/{teacher_id}")
def update_teacher(
    teacher_id: str,
    body: TeacherUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    teacher = _get_scoped(db, current_user, teacher_id)
    updates = body.model_dump(exclude_unset=True, exclude={"matiere_ids", "classroom_ids"})
    for field, value in updates.items():
        setattr(teacher, field, value)
    body_dict = body.model_dump(exclude_unset=True)
    _sync_links(db, teacher.id, body_dict.get("matiere_ids"), body_dict.get("classroom_ids"))
    db.commit()
    db.refresh(teacher)
    return envelope(_serialize(db, teacher), "Enseignant mis à jour.")


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
