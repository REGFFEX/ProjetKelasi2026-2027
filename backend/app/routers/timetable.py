from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.authz import get_teacher_row, write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.operations import TimetableSlot
from app.models.people import TeacherAssignment
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.timetable import TimetableSlotCreate, TimetableSlotUpdate, TimetableSlotOut

router = APIRouter(prefix="/timetable", tags=["timetable"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.teacher)
WRITE_ROLES = (Role.school_admin,)


def _get_assignment(db: Session, school_id: str, assignment_id: str) -> TeacherAssignment:
    assignment = db.get(TeacherAssignment, assignment_id)
    if not assignment or assignment.school_id != school_id:
        raise APIException(404, "Affectation introuvable.")
    return assignment


def _assert_no_overlap(
    db: Session, school_id: str, assignment: TeacherAssignment, jour, heure_debut, heure_fin, exclude_id: str | None = None
) -> None:
    """A teacher or a classroom can't be in two places at once — check both, same day,
    against any slot whose time range intersects the one being saved."""
    same_day = (
        db.query(TimetableSlot)
        .join(TeacherAssignment, TimetableSlot.assignment_id == TeacherAssignment.id)
        .filter(
            TimetableSlot.school_id == school_id,
            TimetableSlot.jour == jour,
            TimetableSlot.heure_debut < heure_fin,
            TimetableSlot.heure_fin > heure_debut,
        )
    )
    if exclude_id:
        same_day = same_day.filter(TimetableSlot.id != exclude_id)

    for slot in same_day.all():
        other = db.get(TeacherAssignment, slot.assignment_id)
        if not other:
            continue
        if other.teacher_id == assignment.teacher_id:
            raise APIException(409, "Cet enseignant a déjà un cours sur ce créneau.")
        if other.classroom_id == assignment.classroom_id:
            raise APIException(409, "Cette classe a déjà un cours sur ce créneau.")


@router.get("")
def list_timetable_slots(
    classroom_id: str | None = Query(default=None),
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    query = db.query(TimetableSlot).filter(TimetableSlot.school_id == current_user.school_id)
    if current_user.role == Role.teacher:
        teacher = get_teacher_row(db, current_user)
        assignment_ids = [
            a.id for a in db.query(TeacherAssignment).filter(TeacherAssignment.teacher_id == teacher.id).all()
        ]
        if not assignment_ids:
            return envelope([])
        query = query.filter(TimetableSlot.assignment_id.in_(assignment_ids))
    elif classroom_id:
        assignment_ids = [
            a.id
            for a in db.query(TeacherAssignment)
            .filter(TeacherAssignment.school_id == current_user.school_id, TeacherAssignment.classroom_id == classroom_id)
            .all()
        ]
        query = query.filter(TimetableSlot.assignment_id.in_(assignment_ids)) if assignment_ids else query.filter(False)
    rows = query.order_by(TimetableSlot.jour, TimetableSlot.heure_debut).all()
    return envelope([TimetableSlotOut.model_validate(r).model_dump(mode="json") for r in rows])


@router.post("")
def create_timetable_slot(
    body: TimetableSlotCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    assignment = _get_assignment(db, current_user.school_id, body.assignment_id)
    _assert_no_overlap(db, current_user.school_id, assignment, body.jour, body.heure_debut, body.heure_fin)

    row = TimetableSlot(school_id=current_user.school_id, **body.model_dump())
    db.add(row)
    db.flush()
    write_audit_log(db, current_user, "CREATE_TIMETABLE_SLOT", "timetable_slot", row.id)
    db.commit()
    db.refresh(row)
    return envelope(TimetableSlotOut.model_validate(row).model_dump(mode="json"), "Créneau créé.")


@router.patch("/{slot_id}")
def update_timetable_slot(
    slot_id: str,
    body: TimetableSlotUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = db.get(TimetableSlot, slot_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Créneau introuvable.")

    data = body.model_dump(exclude_unset=True)
    assignment_id = data.get("assignment_id", row.assignment_id)
    jour = data.get("jour", row.jour)
    heure_debut = data.get("heure_debut", row.heure_debut)
    heure_fin = data.get("heure_fin", row.heure_fin)
    assignment = _get_assignment(db, current_user.school_id, assignment_id)
    _assert_no_overlap(db, current_user.school_id, assignment, jour, heure_debut, heure_fin, exclude_id=row.id)

    for key, value in data.items():
        setattr(row, key, value)
    write_audit_log(db, current_user, "UPDATE_TIMETABLE_SLOT", "timetable_slot", row.id)
    db.commit()
    db.refresh(row)
    return envelope(TimetableSlotOut.model_validate(row).model_dump(mode="json"), "Créneau mis à jour.")


@router.delete("/{slot_id}")
def delete_timetable_slot(
    slot_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = db.get(TimetableSlot, slot_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Créneau introuvable.")
    write_audit_log(db, current_user, "DELETE_TIMETABLE_SLOT", "timetable_slot", row.id)
    db.delete(row)
    db.commit()
    return envelope(None, "Créneau supprimé.")
