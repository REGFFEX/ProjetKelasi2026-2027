from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.authz import get_active_academic_year_or_none
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.academic import AcademicYear, Cycle, Level, Term
from app.models.finance import Invoice, Payment
from app.models.people import Classroom, Enrollment, EnrollmentStatus, Student, Teacher
from app.models.school import School
from app.models.user import Role, UserStatus
from app.pdf.bulletin import _subject_breakdown
from app.pdf.reports import build_report_pdf
from app.response import envelope, APIException
from app.routers.teaching_sessions import compute_hours_report
from app.schemas.business_overview import (
    BusinessOverview,
    CycleEnrollmentComparison,
    EnrollmentOverview,
    FeeTypeBreakdown,
    MonthlyRevenuePoint,
    RevenueOverview,
    StaffingOverview,
)

router = APIRouter(prefix="/reports", tags=["reports"])

VALID_TYPES = {"financial", "attendance", "grades"}

DECISION_ORDER = {"admis": 0, "echoue": 1, "absent": 2}

MONTH_NAMES_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def _month_label(key: str) -> str:
    year_str, month_str = key.split("-")
    return MONTH_NAMES_FR[int(month_str) - 1]


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

    level = db.get(Level, classroom.level_id)
    cycle = db.get(Cycle, level.cycle_id) if level else None

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
        _, general_avg = _subject_breakdown(db, student, classroom_id, term, cycle)
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


def _enrollment_breakdown(db: Session, school_id: str, year: AcademicYear | None) -> tuple[set[str], dict[str, int]]:
    """Active enrollments for one academic year, grouped by cycle name. Returns the
    set of enrolled student ids (for growth/attrition) alongside the per-cycle counts."""
    if not year:
        return set(), {}
    enrollments = (
        db.query(Enrollment)
        .filter(
            Enrollment.school_id == school_id,
            Enrollment.academic_year_id == year.id,
            Enrollment.statut == EnrollmentStatus.active,
        )
        .all()
    )
    classroom_ids = {e.classroom_id for e in enrollments}
    classrooms = {c.id: c for c in db.query(Classroom).filter(Classroom.id.in_(classroom_ids)).all()} if classroom_ids else {}
    level_ids = {c.level_id for c in classrooms.values()}
    levels = {l.id: l for l in db.query(Level).filter(Level.id.in_(level_ids)).all()} if level_ids else {}
    cycle_ids = {l.cycle_id for l in levels.values()}
    cycles = {cy.id: cy for cy in db.query(Cycle).filter(Cycle.id.in_(cycle_ids)).all()} if cycle_ids else {}

    student_ids: set[str] = set()
    by_cycle: dict[str, int] = {}
    for e in enrollments:
        student_ids.add(e.student_id)
        classroom = classrooms.get(e.classroom_id)
        level = levels.get(classroom.level_id) if classroom else None
        cycle = cycles.get(level.cycle_id) if level else None
        cycle_name = cycle.nom if cycle else "Non classé"
        by_cycle[cycle_name] = by_cycle.get(cycle_name, 0) + 1
    return student_ids, by_cycle


@router.get("/business-overview")
def get_business_overview(
    current_user: CurrentUser = Depends(require_role(Role.school_admin)),
    db: Session = Depends(get_db),
):
    """The director's strategic view: revenue trend and health, enrollment growth
    and retention, staffing cost — deliberately not the day-to-day operational
    numbers (today's attendance, today's payments) shown elsewhere."""
    school_id = current_user.school_id
    current_year = get_active_academic_year_or_none(db, school_id)
    previous_year = None
    if current_year:
        previous_year = (
            db.query(AcademicYear)
            .filter(AcademicYear.school_id == school_id, AcademicYear.date_debut < current_year.date_debut)
            .order_by(AcademicYear.date_debut.desc())
            .first()
        )

    # ── Revenue, scoped to the active academic year's invoices ──
    invoices_this_year = (
        db.query(Invoice)
        .filter(
            Invoice.school_id == school_id,
            Invoice.date_emission >= current_year.date_debut,
            Invoice.date_emission <= current_year.date_fin,
        )
        .all()
        if current_year
        else []
    )
    total_invoiced = sum(i.montant_total for i in invoices_this_year)
    total_collected = sum(i.montant_paye for i in invoices_this_year)
    total_outstanding = sum(i.reste_a_payer for i in invoices_this_year)
    collection_rate = round(total_collected / total_invoiced * 100, 1) if total_invoiced else None

    fee_type_totals: dict[str, int] = {}
    for i in invoices_this_year:
        fee_type_totals[i.type_frais.value] = fee_type_totals.get(i.type_frais.value, 0) + i.montant_paye
    by_fee_type = [
        FeeTypeBreakdown(type_frais=k, montant=v) for k, v in sorted(fee_type_totals.items(), key=lambda kv: -kv[1])
    ]

    today = date.today()
    month_keys: list[tuple[int, int]] = []
    y, m = today.year, today.month
    for _ in range(12):
        month_keys.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    month_keys.reverse()

    all_payments = db.query(Payment).filter(Payment.school_id == school_id).all()
    monthly_totals = {ym: 0 for ym in month_keys}
    for p in all_payments:
        key = (p.date_paiement.year, p.date_paiement.month)
        if key in monthly_totals:
            monthly_totals[key] += p.montant
    monthly_trend = [MonthlyRevenuePoint(mois=f"{y}-{m:02d}", montant=monthly_totals[(y, m)]) for (y, m) in month_keys]
    current_month_revenue = monthly_trend[-1].montant
    previous_month_revenue = monthly_trend[-2].montant if len(monthly_trend) > 1 else 0
    revenue_trend_pct = (
        round((current_month_revenue - previous_month_revenue) / previous_month_revenue * 100, 1)
        if previous_month_revenue
        else None
    )

    # ── Enrollment: this year vs the immediately preceding one ──
    current_student_ids, current_by_cycle = _enrollment_breakdown(db, school_id, current_year)
    previous_student_ids, previous_by_cycle = _enrollment_breakdown(db, school_id, previous_year)

    current_total = len(current_student_ids)
    previous_total = len(previous_student_ids)
    growth_pct = round((current_total - previous_total) / previous_total * 100, 1) if previous_total else None
    attrition_pct = (
        round(len(previous_student_ids - current_student_ids) / previous_total * 100, 1) if previous_total else None
    )
    new_enrollments = len(current_student_ids - previous_student_ids)

    cycle_names = sorted(set(current_by_cycle) | set(previous_by_cycle))
    by_cycle = [
        CycleEnrollmentComparison(cycle=c, actuel=current_by_cycle.get(c, 0), precedent=previous_by_cycle.get(c, 0))
        for c in cycle_names
    ]

    revenue_per_student = round(total_collected / current_total, 0) if current_total else None

    # ── Staffing ──
    active_teachers = db.query(Teacher).filter(Teacher.school_id == school_id, Teacher.statut == UserStatus.actif).count()
    student_teacher_ratio = round(current_total / active_teachers, 1) if active_teachers else None

    hourly_cost_this_month = None
    has_hourly_cycle = db.query(Cycle).filter(Cycle.school_id == school_id, Cycle.paiement_horaire.is_(True)).first()
    if has_hourly_cycle and current_year:
        hourly_report = compute_hours_report(db, school_id, today.month, today.year)
        hourly_cost_this_month = hourly_report.total_montant

    # ── Alerts: only what needs a decision, not routine status ──
    alerts: list[str] = []
    if not current_year:
        alerts.append("Aucune année scolaire active — les indicateurs financiers ne peuvent pas être calculés.")
    if collection_rate is not None and collection_rate < 70:
        alerts.append(f"Taux de recouvrement à {collection_rate}% sur l'année en cours — impayés à relancer.")
    if attrition_pct is not None and attrition_pct >= 15:
        alerts.append(f"{attrition_pct}% des élèves de l'année précédente ne sont pas réinscrits cette année.")
    for row in by_cycle:
        if 0 < row.actuel <= 5:
            alerts.append(f"Effectif très faible sur le cycle « {row.cycle} » ({row.actuel} élève(s)).")
    # Comparing the current (partial) month against a fully completed previous
    # month is systematically biased downward for most of the month — not a real
    # decline. The alert instead compares the last two FULLY completed months.
    if len(monthly_trend) >= 3:
        last_completed = monthly_trend[-2].montant
        before_that = monthly_trend[-3].montant
        if before_that:
            completed_trend_pct = round((last_completed - before_that) / before_that * 100, 1)
            if completed_trend_pct <= -20:
                alerts.append(f"Recettes en baisse de {abs(completed_trend_pct)}% en {_month_label(monthly_trend[-2].mois)} par rapport au mois précédent.")

    overview = BusinessOverview(
        academic_year_label=current_year.libelle if current_year else None,
        revenue=RevenueOverview(
            current_month=current_month_revenue,
            previous_month=previous_month_revenue,
            trend_pct=revenue_trend_pct,
            collection_rate_pct=collection_rate,
            total_invoiced=total_invoiced,
            total_collected=total_collected,
            total_outstanding=total_outstanding,
            revenue_per_student=revenue_per_student,
            monthly_trend=monthly_trend,
            by_fee_type=by_fee_type,
        ),
        enrollment=EnrollmentOverview(
            current_total=current_total,
            previous_total=previous_total,
            growth_pct=growth_pct,
            attrition_pct=attrition_pct,
            new_enrollments=new_enrollments,
            by_cycle=by_cycle,
            has_previous_year=previous_year is not None,
        ),
        staffing=StaffingOverview(
            active_teachers=active_teachers,
            student_teacher_ratio=student_teacher_ratio,
            hourly_cost_this_month=hourly_cost_this_month,
        ),
        alerts=alerts,
    )
    return envelope(overview.model_dump())
