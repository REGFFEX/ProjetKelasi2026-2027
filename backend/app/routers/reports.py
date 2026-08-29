from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.authz import get_active_academic_year_or_none
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.academic import Term
from app.models.people import Classroom, Enrollment, Student
from app.models.school import School
from app.models.user import Role
from app.pdf.bulletin import _subject_breakdown
from app.pdf.reports import build_report_pdf
from app.response import envelope, APIException

router = APIRouter(prefix="/reports", tags=["reports"])

VALID_TYPES = {"financial", "attendance", "grades"}

DECISION_ORDER = {"admis": 0, "echoue": 1, "absent": 2}


@router.get("/export.pdf")
def export_report(
    type: str = "financial",
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: CurrentUser = Depends(require_role(Role.school_admin, Role.accountant)),
    db: Session = Depends(get_db),
):
    if type not in VALID_TYPES:
        raise APIException(400, "Type de rapport invalide.")
    school = db.get(School, current_user.school_id)
    pdf_bytes = build_report_pdf(db, school, type, date_from, date_to)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="rapport-{type}.pdf"'},
    )


@router.get("/deliberation")
def get_deliberation(
    classroom_id: str,
    term_id: str | None = None,
    seuil: float = 10.0,
    current_user: CurrentUser = Depends(require_role(Role.school_admin, Role.secretary)),
    db: Session = Depends(get_db),
):
    classroom = db.get(Classroom, classroom_id)
    if not classroom or classroom.school_id != current_user.school_id:
        raise APIException(404, "Classe introuvable.")

    term = None
    if term_id:
        term = db.get(Term, term_id)
        if not term or term.school_id != current_user.school_id:
            raise APIException(404, "Période introuvable.")

    year = get_active_academic_year_or_none(db, current_user.school_id)
    students: list[Student] = []
    if year:
        student_ids = [
            e.student_id
            for e in db.query(Enrollment)
            .filter(Enrollment.classroom_id == classroom_id, Enrollment.academic_year_id == year.id)
            .all()
        ]
        if student_ids:
            students = db.query(Student).filter(Student.id.in_(student_ids)).all()

    resultats = []
    for student in students:
        _, general_avg = _subject_breakdown(db, student, classroom_id, term)
        moyenne = round(general_avg, 2) if general_avg is not None else None
        decision = "absent" if moyenne is None else ("admis" if moyenne >= seuil else "echoue")
        resultats.append({
            "student_id": student.id,
            "nom": student.nom,
            "prenom": student.prenom,
            "matricule": student.matricule,
            "moyenne": moyenne,
            "decision": decision,
        })

    resultats.sort(key=lambda r: (DECISION_ORDER[r["decision"]], -(r["moyenne"] if r["moyenne"] is not None else -1)))
    rang = 1
    for r in resultats:
        if r["decision"] == "admis":
            r["rang"] = rang
            rang += 1
        else:
            r["rang"] = None

    moyennes = [r["moyenne"] for r in resultats if r["moyenne"] is not None]
    return envelope({
        "classroom_id": classroom_id,
        "classroom_nom": classroom.nom,
        "term_id": term_id,
        "seuil": seuil,
        "resultats": resultats,
        "nb_admis": sum(1 for r in resultats if r["decision"] == "admis"),
        "nb_echoue": sum(1 for r in resultats if r["decision"] == "echoue"),
        "nb_absent": sum(1 for r in resultats if r["decision"] == "absent"),
        "moyenne_classe": round(sum(moyennes) / len(moyennes), 2) if moyennes else None,
    })
