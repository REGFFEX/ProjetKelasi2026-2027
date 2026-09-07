from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.authz import get_active_academic_year, get_teacher_row, write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.academic import Cycle, Level
from app.models.operations import TeacherHourlyRate, TeachingSession, TeachingSessionStatus, TimetableSlot
from app.models.people import Classroom, Teacher, TeacherAssignment
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.teaching_sessions import (
    HourlyRateOut,
    HourlyRateUpsert,
    TeacherHoursReport,
    TeacherHoursReportRow,
    TeachingSessionOut,
    TeachingSessionStart,
)

router = APIRouter(prefix="/teaching-sessions", tags=["teaching-sessions"])

MANAGE_ROLES = (Role.school_admin, Role.accountant)


def _slot_assignment_and_classroom(db: Session, school_id: str, slot_id: str) -> tuple[TimetableSlot, TeacherAssignment, Classroom]:
    slot = db.get(TimetableSlot, slot_id)
    if not slot or slot.school_id != school_id:
        raise APIException(404, "Créneau introuvable.")
    assignment = db.get(TeacherAssignment, slot.assignment_id)
    classroom = db.get(Classroom, assignment.classroom_id) if assignment else None
    if not assignment or not classroom:
        raise APIException(404, "Affectation ou classe introuvable pour ce créneau.")
    return slot, assignment, classroom


def _is_hourly_paid(db: Session, classroom: Classroom) -> bool:
    level = db.get(Level, classroom.level_id)
    if not level:
        return False
    cycle = db.get(Cycle, level.cycle_id)
    return bool(cycle and cycle.paiement_horaire)


@router.get("/rates")
def list_hourly_rates(
    academic_year_id: str | None = None,
    current_user: CurrentUser = Depends(require_role(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    year_id = academic_year_id or get_active_academic_year(db, current_user.school_id).id
    rows = (
        db.query(TeacherHourlyRate)
        .filter(TeacherHourlyRate.school_id == current_user.school_id, TeacherHourlyRate.academic_year_id == year_id)
        .all()
    )
    return envelope([HourlyRateOut.model_validate(r).model_dump() for r in rows])


@router.post("/rates")
def upsert_hourly_rate(
    body: HourlyRateUpsert,
    current_user: CurrentUser = Depends(require_role(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    year_id = body.academic_year_id or get_active_academic_year(db, current_user.school_id).id
    row = (
        db.query(TeacherHourlyRate)
        .filter(
            TeacherHourlyRate.school_id == current_user.school_id,
            TeacherHourlyRate.teacher_id == body.teacher_id,
            TeacherHourlyRate.academic_year_id == year_id,
        )
        .first()
    )
    if row:
        row.taux = body.taux
    else:
        row = TeacherHourlyRate(
            school_id=current_user.school_id, teacher_id=body.teacher_id, academic_year_id=year_id, taux=body.taux
        )
        db.add(row)
    write_audit_log(db, current_user, "UPSERT_HOURLY_RATE", "teacher_hourly_rate", body.teacher_id, new_value={"taux": body.taux})
    db.commit()
    db.refresh(row)
    return envelope(HourlyRateOut.model_validate(row).model_dump(), "Taux horaire enregistré.")


@router.post("/start")
def start_teaching_session(
    body: TeachingSessionStart,
    current_user: CurrentUser = Depends(require_role(Role.teacher)),
    db: Session = Depends(get_db),
):
    teacher = get_teacher_row(db, current_user)
    slot, assignment, classroom = _slot_assignment_and_classroom(db, current_user.school_id, body.timetable_slot_id)
    if assignment.teacher_id != teacher.id:
        raise APIException(403, "Ce créneau ne vous est pas affecté.")
    if not _is_hourly_paid(db, classroom):
        raise APIException(409, "Le suivi des heures n'est pas activé pour cette classe.")

    existing = (
        db.query(TeachingSession)
        .filter(TeachingSession.timetable_slot_id == slot.id, TeachingSession.statut == TeachingSessionStatus.en_cours)
        .first()
    )
    if existing:
        raise APIException(409, "Une séance est déjà en cours pour ce créneau.")

    session = TeachingSession(
        school_id=current_user.school_id,
        timetable_slot_id=slot.id,
        date=date.today(),
        started_at=datetime.utcnow(),
        statut=TeachingSessionStatus.en_cours,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return envelope(TeachingSessionOut.model_validate(session).model_dump(), "Cours démarré.")


@router.post("/{session_id}/end")
def end_teaching_session(
    session_id: str,
    current_user: CurrentUser = Depends(require_role(Role.teacher)),
    db: Session = Depends(get_db),
):
    teacher = get_teacher_row(db, current_user)
    session = db.get(TeachingSession, session_id)
    if not session or session.school_id != current_user.school_id:
        raise APIException(404, "Séance introuvable.")
    slot, assignment, _ = _slot_assignment_and_classroom(db, current_user.school_id, session.timetable_slot_id)
    if assignment.teacher_id != teacher.id:
        raise APIException(403, "Cette séance ne vous appartient pas.")
    if session.statut != TeachingSessionStatus.en_cours:
        raise APIException(409, "Cette séance est déjà terminée.")

    ended_at = datetime.utcnow()
    duree = max(1, int((ended_at - session.started_at).total_seconds() // 60))
    session.ended_at = ended_at
    session.duree_reelle = duree
    session.statut = TeachingSessionStatus.termine
    db.commit()
    db.refresh(session)
    return envelope(TeachingSessionOut.model_validate(session).model_dump(), "Cours terminé.")


@router.get("")
def list_teaching_sessions(
    current_user: CurrentUser = Depends(require_role(Role.school_admin, Role.accountant, Role.teacher)),
    db: Session = Depends(get_db),
):
    query = db.query(TeachingSession).filter(TeachingSession.school_id == current_user.school_id)
    if current_user.role == Role.teacher:
        teacher = get_teacher_row(db, current_user)
        slot_ids = [
            s.id
            for s in db.query(TimetableSlot)
            .join(TeacherAssignment, TimetableSlot.assignment_id == TeacherAssignment.id)
            .filter(TeacherAssignment.teacher_id == teacher.id)
            .all()
        ]
        if not slot_ids:
            return envelope([])
        query = query.filter(TeachingSession.timetable_slot_id.in_(slot_ids))
    rows = query.order_by(TeachingSession.started_at.desc()).all()
    return envelope([TeachingSessionOut.model_validate(r).model_dump() for r in rows])


def compute_hours_report(db: Session, school_id: str, month: int, year_num: int) -> TeacherHoursReport:
    year = get_active_academic_year(db, school_id)
    rates = {
        r.teacher_id: float(r.taux)
        for r in db.query(TeacherHourlyRate)
        .filter(TeacherHourlyRate.school_id == school_id, TeacherHourlyRate.academic_year_id == year.id)
        .all()
    }

    sessions = (
        db.query(TeachingSession)
        .filter(
            TeachingSession.school_id == school_id,
            TeachingSession.statut == TeachingSessionStatus.termine,
        )
        .all()
    )
    sessions = [s for s in sessions if s.date.month == month and s.date.year == year_num]

    slot_to_teacher: dict[str, str] = {}
    for s in sessions:
        if s.timetable_slot_id in slot_to_teacher:
            continue
        slot = db.get(TimetableSlot, s.timetable_slot_id)
        assignment = db.get(TeacherAssignment, slot.assignment_id) if slot else None
        if assignment:
            slot_to_teacher[s.timetable_slot_id] = assignment.teacher_id

    per_teacher: dict[str, dict] = {}
    for s in sessions:
        teacher_id = slot_to_teacher.get(s.timetable_slot_id)
        if not teacher_id:
            continue
        bucket = per_teacher.setdefault(teacher_id, {"nb_seances": 0, "total_min": 0})
        bucket["nb_seances"] += 1
        bucket["total_min"] += s.duree_reelle or 0

    teachers = {
        t.id: t for t in db.query(Teacher).filter(Teacher.id.in_(per_teacher.keys())).all()
    } if per_teacher else {}

    lignes = []
    for teacher_id, data in per_teacher.items():
        teacher = teachers.get(teacher_id)
        if not teacher:
            continue
        heures = round(data["total_min"] / 60, 2)
        taux = rates.get(teacher_id, 0.0)
        lignes.append(
            TeacherHoursReportRow(
                teacher_id=teacher_id, nom=teacher.nom, prenom=teacher.prenom,
                nb_seances=data["nb_seances"], total_heures=heures, taux=taux,
                montant=round(heures * taux, 0),
            )
        )
    lignes.sort(key=lambda r: r.nom)

    return TeacherHoursReport(
        mois=month, annee=year_num, lignes=lignes,
        total_heures=round(sum(l.total_heures for l in lignes), 2),
        total_montant=round(sum(l.montant for l in lignes), 0),
    )


@router.get("/report")
def get_hours_report(
    mois: int = Query(default=None),
    annee: int = Query(default=None),
    current_user: CurrentUser = Depends(require_role(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    today = date.today()
    month = mois or today.month
    year_num = annee or today.year
    report = compute_hours_report(db, current_user.school_id, month, year_num)
    return envelope(report.model_dump())
