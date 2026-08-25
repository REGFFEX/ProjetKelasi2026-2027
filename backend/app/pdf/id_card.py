import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.models.people import Student
from app.models.school import School
from app.pdf.common import resolve_student_classroom

COVER = colors.HexColor("#14261F")
GOLD = colors.HexColor("#C9A227")
PARCHMENT = colors.HexColor("#F3EEDF")
INK = colors.HexColor("#1F2420")

# Standard ID-1 card size (bank card format), 85.6mm x 54mm.
CARD_W, CARD_H = 85.6 * mm, 54 * mm


def build_id_card_pdf(db: Session, student: Student, school: School) -> bytes:
    classroom, year = resolve_student_classroom(db, student, school.id)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=20 * mm,
        title=f"Carte scolaire - {student.prenom} {student.nom}",
    )

    name_style = ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=12.5, textColor=PARCHMENT, leading=15)
    school_style = ParagraphStyle("school", fontName="Helvetica-Bold", fontSize=9, textColor=GOLD, spaceAfter=2)
    field_label = ParagraphStyle("fl", fontName="Helvetica", fontSize=6.5, textColor=colors.HexColor("#9AA79E"))
    field_value = ParagraphStyle("fv", fontName="Helvetica-Bold", fontSize=9, textColor=PARCHMENT, leading=11)
    note_style = ParagraphStyle("note", fontName="Helvetica", fontSize=8.5, textColor=INK, spaceBefore=8)

    classe_txt = classroom.nom if classroom else "—"
    annee_txt = year.libelle if year else "—"

    photo_box = Table([[""]], colWidths=[18 * mm], rowHeights=[20 * mm])
    photo_box.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, GOLD),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1D3329")),
    ]))

    info_rows = [
        [Paragraph("ÉLÈVE", field_label)],
        [Paragraph(f"{student.prenom} {student.nom}", field_value)],
        [Paragraph("MATRICULE", field_label)],
        [Paragraph(student.matricule, field_value)],
        [Paragraph("CLASSE", field_label)],
        [Paragraph(f"{classe_txt}  ·  {annee_txt}", field_value)],
    ]
    info_table = Table(info_rows, colWidths=[52 * mm])
    info_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))

    header = Table(
        [[Paragraph(school.nom.upper(), school_style)], [Paragraph("CARTE SCOLAIRE", name_style)]],
        colWidths=[CARD_W - 10 * mm],
    )
    header.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0)]))

    body = Table([[photo_box, info_table]], colWidths=[22 * mm, 52 * mm])
    body.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))

    card_inner = Table([[header], [Spacer(1, 4 * mm)], [body]], colWidths=[CARD_W - 10 * mm])
    card_inner.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0)]))

    card = Table([[card_inner]], colWidths=[CARD_W], rowHeights=[CARD_H])
    card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COVER),
        ("BOX", (0, 0), (-1, -1), 1, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 5 * mm),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))

    elements = [
        card,
        Paragraph(
            "Carte à imprimer et découper au format standard (85,6 × 54 mm).",
            note_style,
        ),
    ]

    doc.build(elements)
    return buf.getvalue()
