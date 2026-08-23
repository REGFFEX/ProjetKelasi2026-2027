import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.models.academic import Cycle, EvaluationMode, Level, Term
from app.models.operations import Assessment, Grade
from app.models.people import Classroom, Student, Subject
from app.models.school import School

GOLD = colors.HexColor("#8C6D1F")
INK = colors.HexColor("#1F2420")
INK_SOFT = colors.HexColor("#5B6259")
RULE = colors.HexColor("#C9BE9E")
PASS_GREEN = colors.HexColor("#2F5F45")
FAIL_RED = colors.HexColor("#8C3A2B")


def _subject_breakdown(db: Session, student: Student, classroom_id: str | None, term: Term | None):
    """Same weighting formula the app uses everywhere else: per-subject average is
    grade-weighted by each assessment's own coefficient, then the general average is
    weighted by the subject's coefficient."""
    if not classroom_id:
        return [], None

    q = db.query(Assessment).filter(Assessment.classroom_id == classroom_id)
    if term:
        q = q.filter(Assessment.term_id == term.id)
    assessments = q.all()
    if not assessments:
        return [], None

    assessment_ids = [a.id for a in assessments]
    grades = (
        db.query(Grade)
        .filter(Grade.student_id == student.id, Grade.assessment_id.in_(assessment_ids))
        .all()
    )
    grades_by_assessment = {g.assessment_id: g for g in grades}

    subject_ids = {a.subject_id for a in assessments}
    subjects = {s.id: s for s in db.query(Subject).filter(Subject.id.in_(subject_ids)).all()}

    per_subject: dict[str, dict] = {}
    for assessment in assessments:
        grade = grades_by_assessment.get(assessment.id)
        if not grade:
            continue
        subject = subjects.get(assessment.subject_id)
        if not subject:
            continue
        bucket = per_subject.setdefault(
            subject.id, {"nom": subject.nom, "coef": subject.coefficient, "points": 0.0, "coefs": 0, "appreciations": []}
        )
        if grade.note is not None:
            bucket["points"] += float(grade.note) * assessment.coefficient
            bucket["coefs"] += assessment.coefficient
        if grade.appreciation:
            bucket["appreciations"].append(grade.appreciation)

    rows = []
    total_points, total_coefs = 0.0, 0
    for data in sorted(per_subject.values(), key=lambda d: d["nom"]):
        avg = data["points"] / data["coefs"] if data["coefs"] else None
        if avg is not None:
            total_points += avg * data["coef"]
            total_coefs += data["coef"]
        rows.append({**data, "avg": avg})

    general_avg = total_points / total_coefs if total_coefs else None
    return rows, general_avg


def build_bulletin_pdf(db: Session, student: Student, school: School, term: Term | None = None) -> bytes:
    from app.authz import get_active_academic_year_or_none

    year = get_active_academic_year_or_none(db, school.id)
    classroom_id = None
    classroom = None
    cycle = None
    if year:
        from app.models.people import Enrollment

        enrollment = (
            db.query(Enrollment)
            .filter(Enrollment.student_id == student.id, Enrollment.academic_year_id == year.id)
            .first()
        )
        if enrollment:
            classroom_id = enrollment.classroom_id
            classroom = db.get(Classroom, classroom_id)
            if classroom:
                level = db.get(Level, classroom.level_id)
                if level:
                    cycle = db.get(Cycle, level.cycle_id)

    rows, general_avg = _subject_breakdown(db, student, classroom_id, term)
    is_qualitatif = cycle is not None and cycle.evaluation_mode == EvaluationMode.qualitatif

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm, topMargin=20 * mm, bottomMargin=20 * mm,
        title=f"Bulletin - {student.prenom} {student.nom}",
    )

    styles = getSampleStyleSheet()
    school_style = ParagraphStyle("school", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=14, textColor=INK, spaceAfter=2)
    meta_style = ParagraphStyle("meta", parent=styles["Normal"], fontName="Helvetica", fontSize=9, textColor=INK_SOFT)
    title_style = ParagraphStyle("title", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=16, textColor=GOLD, spaceBefore=14, spaceAfter=2, alignment=1)
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], fontName="Helvetica", fontSize=10, textColor=INK_SOFT, alignment=1, spaceAfter=14)
    label_style = ParagraphStyle("label", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5, textColor=INK)

    elements = [
        Paragraph(school.nom, school_style),
        Paragraph(f"{school.adresse or ''}" + (f" · {school.telephone}" if school.telephone else ""), meta_style),
        Paragraph("BULLETIN SCOLAIRE", title_style),
        Paragraph(
            (term.libelle if term else "Cumul de l'année scolaire") + (f" — {year.libelle}" if year else ""),
            sub_style,
        ),
    ]

    info_rows = [
        ["Élève", f"{student.prenom} {student.nom}"],
        ["Matricule", student.matricule],
        ["Classe", classroom.nom if classroom else "Non affecté"],
        ["Date de naissance", student.date_naissance.strftime("%d/%m/%Y")],
    ]
    info_table = Table(info_rows, colWidths=[45 * mm, 110 * mm], hAlign="LEFT")
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements += [info_table, Spacer(1, 14 * mm)]

    if not rows:
        elements.append(Paragraph("Aucune évaluation enregistrée pour cette période.", label_style))
    elif is_qualitatif:
        data = [["Matière", "Observations"]]
        for r in rows:
            text = " · ".join(r["appreciations"]) if r["appreciations"] else "—"
            data.append([r["nom"], text])
        table = Table(data, colWidths=[45 * mm, 110 * mm], hAlign="LEFT")
        table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("TEXTCOLOR", (0, 0), (-1, -1), INK),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, GOLD),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, RULE),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)
    else:
        data = [["Matière", "Coef.", "Moyenne /20"]]
        for r in rows:
            avg_text = f"{r['avg']:.2f}" if r["avg"] is not None else "—"
            data.append([r["nom"], str(r["coef"]), avg_text])
        table = Table(data, colWidths=[95 * mm, 25 * mm, 35 * mm], hAlign="LEFT")
        row_styles = [
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("TEXTCOLOR", (0, 0), (-1, -1), INK),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, GOLD),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, RULE),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
        for i, r in enumerate(rows, start=1):
            if r["avg"] is not None:
                color = PASS_GREEN if r["avg"] >= 10 else FAIL_RED
                row_styles.append(("TEXTCOLOR", (2, i), (2, i), color))
                row_styles.append(("FONTNAME", (2, i), (2, i), "Helvetica-Bold"))
        table.setStyle(TableStyle(row_styles))
        elements.append(table)

        if general_avg is not None:
            elements.append(Spacer(1, 8 * mm))
            avg_color = PASS_GREEN if general_avg >= 10 else FAIL_RED
            avg_table = Table([["Moyenne générale", f"{general_avg:.2f} / 20"]], colWidths=[120 * mm, 35 * mm], hAlign="LEFT")
            avg_table.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("TEXTCOLOR", (0, 0), (0, 0), INK),
                ("TEXTCOLOR", (1, 0), (1, 0), avg_color),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LINEABOVE", (0, 0), (-1, 0), 1, GOLD),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
            ]))
            elements.append(avg_table)

    elements += [Spacer(1, 16 * mm), Paragraph(f"Document généré le {date.today().strftime('%d/%m/%Y')} par Kelasi.", meta_style)]

    doc.build(elements)
    return buf.getvalue()
