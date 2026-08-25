import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.models.finance import Invoice, Payment
from app.models.people import Student
from app.models.school import School

INK = colors.HexColor("#1F2420")
INK_SOFT = colors.HexColor("#5B6259")
GOLD = colors.HexColor("#8C6D1F")
RULE = colors.HexColor("#C9BE9E")
GREEN = colors.HexColor("#2F5F45")

FEE_LABELS = {
    "scolarite": "Frais de scolarité",
    "inscription": "Frais d'inscription",
    "cantine": "Cantine",
    "transport": "Transport",
    "autre": "Autre",
}

METHOD_LABELS = {
    "especes": "Espèces",
    "cheque": "Chèque",
    "virement": "Virement bancaire",
    "mobile_money": "Mobile Money",
    "carte_bancaire": "Carte bancaire",
}


def format_money(amount: int) -> str:
    return f"{amount:,.0f}".replace(",", " ") + " FC"


def build_receipt_pdf(db: Session, payment: Payment, invoice: Invoice, student: Student, school: School) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=24 * mm, rightMargin=24 * mm, topMargin=22 * mm, bottomMargin=22 * mm,
        title=f"Reçu de paiement - {student.prenom} {student.nom}",
    )

    school_style = ParagraphStyle("school", fontName="Helvetica-Bold", fontSize=13, textColor=INK, spaceAfter=2)
    meta_style = ParagraphStyle("meta", fontName="Helvetica", fontSize=9, textColor=INK_SOFT)
    title_style = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, textColor=GOLD, spaceBefore=14, spaceAfter=2)
    ref_style = ParagraphStyle("ref", fontName="Helvetica", fontSize=9.5, textColor=INK_SOFT, spaceAfter=16)
    label_style = ParagraphStyle("label", fontName="Helvetica", fontSize=9.5, textColor=INK)

    elements = [
        Paragraph(school.nom, school_style),
        Paragraph((school.adresse or "") + (f" · {school.telephone}" if school.telephone else ""), meta_style),
        Paragraph("REÇU DE PAIEMENT", title_style),
        Paragraph(f"Reçu N° {payment.id[:8].upper()} — délivré le {date.today().strftime('%d/%m/%Y')}", ref_style),
    ]

    info_rows = [
        ["Élève", f"{student.prenom} {student.nom}"],
        ["Matricule", student.matricule],
        ["Nature", FEE_LABELS.get(invoice.type_frais.value, invoice.type_frais.value)],
        ["Mode de paiement", METHOD_LABELS.get(payment.mode_paiement.value, payment.mode_paiement.value)],
        ["Date de paiement", payment.date_paiement.strftime("%d/%m/%Y")],
    ]
    info_table = Table(info_rows, colWidths=[45 * mm, 100 * mm], hAlign="LEFT")
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements += [info_table, Spacer(1, 10 * mm)]

    amount_rows = [
        ["Montant total de la facture", format_money(invoice.montant_total)],
        ["Montant de ce paiement", format_money(payment.montant)],
        ["Solde restant après ce paiement", format_money(invoice.reste_a_payer)],
    ]
    amount_table = Table(amount_rows, colWidths=[110 * mm, 35 * mm], hAlign="LEFT")
    amount_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("LINEBELOW", (0, 0), (-1, 0), 0.4, RULE),
        ("LINEBELOW", (0, 1), (-1, 1), 0.4, RULE),
        ("LINEABOVE", (0, 2), (-1, 2), 1, GOLD),
        ("TEXTCOLOR", (1, 2), (1, 2), GREEN if invoice.reste_a_payer == 0 else INK),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    elements.append(amount_table)

    status_text = "Facture soldée." if invoice.reste_a_payer == 0 else "Paiement partiel — solde restant dû."
    elements += [Spacer(1, 12 * mm), Paragraph(status_text, label_style),
                 Spacer(1, 16 * mm), Paragraph(f"Document généré le {date.today().strftime('%d/%m/%Y')} par Kelasi.", meta_style)]

    doc.build(elements)
    return buf.getvalue()
