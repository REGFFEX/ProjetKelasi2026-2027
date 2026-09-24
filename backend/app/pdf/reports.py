import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.models.finance import Invoice, Payment
from app.models.operations import Attendance, Grade, Assessment
from app.models.people import Classroom
from app.models.school import School

INK = colors.HexColor("#1F2420")
INK_SOFT = colors.HexColor("#5B6259")
GOLD = colors.HexColor("#8C6D1F")
RULE = colors.HexColor("#C9BE9E")

REPORT_TITLES = {
    "financial": "RAPPORT FINANCIER",
    "attendance": "RAPPORT DE PRÉSENCE",
    "grades": "RAPPORT DE NOTES",
}

METHOD_LABELS = {
    "especes": "Espèces", "mobile_money": "Mobile Money", "virement": "Virement", "cheque": "Chèque",
    "carte_bancaire": "Carte bancaire",
}

STATUT_LABELS = {"present": "Présent", "absent": "Absent", "retard": "Retard", "justifie": "Justifié"}


def _format_money(amount: int) -> str:
    return f"{amount:,.0f}".replace(",", " ") + " FC"


def _base_elements(school: School, report_type: str, date_from: date | None, date_to: date | None) -> list:
    school_style = ParagraphStyle("school", fontName="Helvetica-Bold", fontSize=13, textColor=INK, spaceAfter=2)
    meta_style = ParagraphStyle("meta", fontName="Helvetica", fontSize=9, textColor=INK_SOFT, spaceAfter=16)
    title_style = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, textColor=GOLD, spaceBefore=10, spaceAfter=2)
    period_style = ParagraphStyle("period", fontName="Helvetica", fontSize=9.5, textColor=INK_SOFT, spaceAfter=16)

    if date_from and date_to:
        period_text = f"Période : {date_from.strftime('%d/%m/%Y')} — {date_to.strftime('%d/%m/%Y')}"
    else:
        period_text = "Toutes périodes confondues"

    return [
        Paragraph(school.nom, school_style),
        Paragraph((school.adresse or "") + (f" · {school.telephone}" if school.telephone else ""), meta_style),
        Paragraph(REPORT_TITLES.get(report_type, "RAPPORT"), title_style),
        Paragraph(period_text, period_style),
    ]


def _table(data: list[list[str]], col_widths: list[float], header: bool = True) -> Table:
    style = [
        ("FONTNAME", (0, 1 if header else 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("LINEBELOW", (0, 0), (-1, 0 if header else -1), 0.4, RULE),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    if header:
        style += [
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, GOLD),
        ]
    table = Table(data, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(TableStyle(style))
    return table


def build_report_pdf(
    db: Session, school: School, report_type: str, date_from: date | None, date_to: date | None
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm, topMargin=20 * mm, bottomMargin=20 * mm,
        title=f"{REPORT_TITLES.get(report_type, 'Rapport')} - {school.nom}",
    )
    elements = _base_elements(school, report_type, date_from, date_to)

    if report_type == "financial":
        query = db.query(Invoice).filter(Invoice.school_id == school.id)
        if date_from:
            query = query.filter(Invoice.date_emission >= date_from)
        if date_to:
            query = query.filter(Invoice.date_emission <= date_to)
        invoices = query.all()

        total_billed = sum(i.montant_total for i in invoices)
        total_collected = sum(i.montant_paye for i in invoices)
        total_outstanding = sum(i.reste_a_payer for i in invoices)
        rate = (total_collected / total_billed * 100) if total_billed else 0

        elements.append(_table([
            ["Facturé", _format_money(total_billed)],
            ["Encaissé", _format_money(total_collected)],
            ["Impayés", _format_money(total_outstanding)],
            ["Taux de recouvrement", f"{rate:.1f} %"],
        ], [110 * mm, 40 * mm], header=False))

        pay_query = db.query(Payment).filter(Payment.school_id == school.id)
        if date_from:
            pay_query = pay_query.filter(Payment.date_paiement >= date_from)
        if date_to:
            pay_query = pay_query.filter(Payment.date_paiement <= date_to)
        payments = pay_query.all()

        by_method: dict[str, int] = {}
        for p in payments:
            by_method[p.mode_paiement.value] = by_method.get(p.mode_paiement.value, 0) + p.montant

        rows = [["Mode de paiement", "Montant encaissé"]]
        for method, amount in sorted(by_method.items(), key=lambda x: -x[1]):
            rows.append([METHOD_LABELS.get(method, method), _format_money(amount)])
        if len(rows) > 1:
            elements += [Spacer(1, 10 * mm), _table(rows, [90 * mm, 60 * mm])]

    elif report_type == "attendance":
        query = db.query(Attendance).filter(Attendance.school_id == school.id)
        if date_from:
            query = query.filter(Attendance.date >= date_from)
        if date_to:
            query = query.filter(Attendance.date <= date_to)
        records = query.all()

        totals = {"present": 0, "absent": 0, "retard": 0, "justifie": 0}
        for r in records:
            totals[r.statut.value] = totals.get(r.statut.value, 0) + 1

        elements.append(_table(
            [[STATUT_LABELS[k], str(v)] for k, v in totals.items()],
            [110 * mm, 40 * mm], header=False,
        ))

        classrooms = {c.id: c.nom for c in db.query(Classroom).filter(Classroom.school_id == school.id).all()}
        by_classroom: dict[str, dict[str, int]] = {}
        for r in records:
            if not r.classroom_id:
                continue
            bucket = by_classroom.setdefault(r.classroom_id, {"present": 0, "absent": 0, "retard": 0, "justifie": 0})
            bucket[r.statut.value] = bucket.get(r.statut.value, 0) + 1

        rows = [["Classe", "Présent", "Absent", "Retard", "Justifié"]]
        for classroom_id, bucket in sorted(by_classroom.items(), key=lambda x: classrooms.get(x[0], "")):
            rows.append([classrooms.get(classroom_id, "?"), str(bucket["present"]), str(bucket["absent"]), str(bucket["retard"]), str(bucket["justifie"])])
        if len(rows) > 1:
            elements += [Spacer(1, 10 * mm), _table(rows, [50 * mm, 25 * mm, 25 * mm, 25 * mm, 25 * mm])]

    elif report_type == "grades":
        from app.models.people import Enrollment

        classrooms = db.query(Classroom).filter(Classroom.school_id == school.id).order_by(Classroom.nom).all()
        rows = [["Classe", "Moyenne", "Max", "Min", "Taux de réussite"]]
        for classroom in classrooms:
            enrolled_ids = [
                e.student_id for e in db.query(Enrollment).filter(Enrollment.classroom_id == classroom.id).all()
            ]
            if not enrolled_ids:
                continue
            assessment_query = db.query(Assessment).filter(Assessment.classroom_id == classroom.id)
            if date_from:
                assessment_query = assessment_query.filter(Assessment.date >= date_from)
            if date_to:
                assessment_query = assessment_query.filter(Assessment.date <= date_to)
            assessment_ids = [a.id for a in assessment_query.all()]
            if not assessment_ids:
                continue
            notes = [
                float(g.note) for g in db.query(Grade).filter(
                    Grade.assessment_id.in_(assessment_ids), Grade.student_id.in_(enrolled_ids), Grade.note.isnot(None)
                ).all()
            ]
            if not notes:
                continue
            moyenne = sum(notes) / len(notes)
            taux = len([n for n in notes if n >= 10]) / len(notes) * 100
            rows.append([classroom.nom, f"{moyenne:.1f}", f"{max(notes):.1f}", f"{min(notes):.1f}", f"{taux:.0f} %"])

        if len(rows) > 1:
            elements.append(_table(rows, [50 * mm, 30 * mm, 25 * mm, 25 * mm, 40 * mm]))
        else:
            elements.append(Paragraph("Aucune note enregistrée pour cette période.", ParagraphStyle("empty", fontName="Helvetica", fontSize=10, textColor=INK_SOFT)))

    doc.build(elements)
    return buf.getvalue()
