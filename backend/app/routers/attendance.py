from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

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
            existing.classroom_id = record.classroom_id
            existing.statut = record.statut
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
