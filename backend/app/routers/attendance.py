from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.authz import assert_teacher_scope, write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.operations import Attendance
from app.models.user import Role
from app.response import envelope
from app.schemas.attendance import AttendanceOut, AttendanceUpsert

router = APIRouter(prefix="/attendance", tags=["attendance"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.teacher)
WRITE_ROLES = (Role.school_admin, Role.secretary, Role.teacher)


@router.get("")
def list_attendance(
    classroom_id: str | None = Query(default=None),
    date_: date | None = Query(default=None, alias="date"),
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    query = db.query(Attendance).filter(Attendance.school_id == current_user.school_id)
    if classroom_id:
        query = query.filter(Attendance.classroom_id == classroom_id)
    if date_:
        query = query.filter(Attendance.date == date_)
    rows = query.order_by(Attendance.date.desc()).all()
    return envelope([AttendanceOut.model_validate(r).model_dump() for r in rows])


@router.put("")
def upsert_attendance(
    body: AttendanceUpsert,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    # Secretary has full cross-class access by design (can cover a forgotten appel).
    # Teacher is scoped to classrooms they're actually assigned to this year.
    if current_user.role == Role.teacher:
        checked_classrooms: set[str] = set()
        for record in body.records:
            if record.classroom_id and record.classroom_id not in checked_classrooms:
                assert_teacher_scope(db, current_user, record.classroom_id)
                checked_classrooms.add(record.classroom_id)

    result = []
    for record in body.records:
        existing = (
            db.query(Attendance)
            .filter(
                Attendance.school_id == current_user.school_id,
                Attendance.student_id == record.student_id,
                Attendance.date == record.date,
            )
            .first()
        )
        if existing:
            old_statut = existing.statut.value
            existing.classroom_id = record.classroom_id
            existing.statut = record.statut
            if old_statut != record.statut.value:
                write_audit_log(
                    db, current_user, "UPDATE_ATTENDANCE", "attendance", existing.id,
                    old_value={"statut": old_statut}, new_value={"statut": record.statut.value},
                )
            row = existing
        else:
            row = Attendance(
                school_id=current_user.school_id,
                student_id=record.student_id,
                classroom_id=record.classroom_id,
                date=record.date,
                statut=record.statut,
            )
            db.add(row)
        result.append(row)
    db.commit()
    for row in result:
        db.refresh(row)
    return envelope([AttendanceOut.model_validate(r).model_dump() for r in result], "Présences enregistrées.")
