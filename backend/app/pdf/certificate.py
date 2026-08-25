import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from sqlalchemy.orm import Session

from app.models.people import Student
from app.models.school import School
from app.pdf.common import resolve_student_classroom

INK = colors.HexColor("#1F2420")
INK_SOFT = colors.HexColor("#5B6259")
GOLD = colors.HexColor("#8C6D1F")

MONTHS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def _french_date(d: date) -> str:
    return f"{d.day} {MONTHS_FR[d.month - 1]} {d.year}"


def build_certificate_pdf(db: Session, student: Student, school: School) -> bytes:
    classroom, year = resolve_student_classroom(db, student, school.id)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=28 * mm, rightMargin=28 * mm, topMargin=26 * mm, bottomMargin=26 * mm,
        title=f"Certificat de scolarité - {student.prenom} {student.nom}",
    )

    school_style = ParagraphStyle("school", fontName="Helvetica-Bold", fontSize=13, textColor=INK, spaceAfter=2)
    meta_style = ParagraphStyle("meta", fontName="Helvetica", fontSize=9, textColor=INK_SOFT, spaceAfter=18)
    title_style = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, textColor=GOLD, alignment=1, spaceBefore=10, spaceAfter=24)
    body_style = ParagraphStyle("body", fontName="Helvetica", fontSize=11.5, textColor=INK, leading=20, spaceAfter=14)
    sign_style = ParagraphStyle("sign", fontName="Helvetica", fontSize=10.5, textColor=INK, alignment=2)

    classe_txt = classroom.nom if classroom else "non affecté(e) à une classe"
    annee_txt = year.libelle if year else "en cours"

    body_text = (
        f"Nous soussignés, direction de l'établissement <b>{school.nom}</b>, certifions que "
        f"<b>{student.prenom} {student.nom}</b>, né(e) le {student.date_naissance.strftime('%d/%m/%Y')}, "
        f"immatriculé(e) sous le numéro <b>{student.matricule}</b>, est régulièrement inscrit(e) dans notre "
        f"établissement en classe de <b>{classe_txt}</b> pour l'année scolaire <b>{annee_txt}</b>."
    )

    elements = [
        Paragraph(school.nom, school_style),
        Paragraph((school.adresse or "") + (f" · {school.telephone}" if school.telephone else ""), meta_style),
        Paragraph("CERTIFICAT DE SCOLARITÉ", title_style),
        Paragraph(body_text, body_style),
        Paragraph("Le présent certificat est délivré à l'intéressé(e) pour servir et valoir ce que de droit.", body_style),
        Spacer(1, 30 * mm),
        Paragraph(f"Fait à {school.adresse.split(',')[-1].strip() if school.adresse else ''}, le {_french_date(date.today())}", sign_style),
        Spacer(1, 4 * mm),
        Paragraph("Le directeur / La directrice", sign_style),
    ]

    doc.build(elements)
    return buf.getvalue()
