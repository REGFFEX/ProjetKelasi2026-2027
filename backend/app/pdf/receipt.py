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

_UNITS = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
          "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"]
_TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"]


def _two_digits_fr(n: int) -> str:
    if n < 20:
        return _UNITS[n]
    if n < 70:
        tens, unit = divmod(n, 10)
        word = _TENS[tens]
        if unit == 0:
            return word
        if unit == 1:
            return f"{word} et un"
        return f"{word}-{_UNITS[unit]}"
    if n < 80:
        unit = n - 60  # soixante-dix group: 10..19
        if unit == 11:
            return "soixante et onze"
        return f"soixante-{_UNITS[unit]}"
    if n == 80:
        return "quatre-vingts"
    return f"quatre-vingt-{_UNITS[n - 80]}"  # 81..99, never "et"


def _three_digits_fr(n: int, is_final_group: bool) -> str:
    hundreds, rest = divmod(n, 100)
    parts = []
    if hundreds:
        parts.append("cent" if hundreds == 1 else f"{_UNITS[hundreds]} cent")
        if hundreds > 1 and rest == 0 and is_final_group:
            parts[-1] += "s"  # "deux cents" but "deux cent trois"
    if rest:
        parts.append(_two_digits_fr(rest))
    return " ".join(parts)


def amount_in_words(n: int) -> str:
    """Spells out a whole-franc amount in French, the way a Congolese receipt or
    cheque names the sum in full to prevent later alteration of the digits."""
    if n == 0:
        return "zéro"
    groups = [("milliard", 1_000_000_000), ("million", 1_000_000), ("mille", 1_000), ("", 1)]
    remaining = n
    phrases = []
    for i, (word, scale) in enumerate(groups):
        count, remaining = divmod(remaining, scale)
        if not count:
            continue
        is_final_group = scale == 1
        if word == "mille":
            phrases.append("mille" if count == 1 else f"{_three_digits_fr(count, False)} mille")
        elif word:
            plural = "s" if count > 1 else ""
            phrases.append(f"{_three_digits_fr(count, False)} {word}{plural}")
        else:
            phrases.append(_three_digits_fr(count, is_final_group))
    return " ".join(phrases)


def format_money(amount: int) -> str:
    return f"{amount:,.0f}".replace(",", " ") + " FC"


def _current_classroom_name(db: Session, student: Student) -> str | None:
    from app.authz import get_active_academic_year_or_none
    from app.models.people import Classroom, Enrollment

    year = get_active_academic_year_or_none(db, student.school_id)
    if not year:
        return None
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student.id, Enrollment.academic_year_id == year.id)
        .first()
    )
    if not enrollment:
        return None
    classroom = db.get(Classroom, enrollment.classroom_id)
    return classroom.nom if classroom else None


def _receipt_number(db: Session, payment: Payment) -> str:
    """A sequential number within the payment's calendar year, matching how a
    pre-printed receipt booklet numbers its stubs — not the internal UUID."""
    year_start = date(payment.date_paiement.year, 1, 1)
    year_end = date(payment.date_paiement.year, 12, 31)
    rank = (
        db.query(Payment)
        .filter(
            Payment.school_id == payment.school_id,
            Payment.date_paiement >= year_start,
            Payment.date_paiement <= year_end,
        )
        .filter(
            (Payment.date_paiement < payment.date_paiement)
            | ((Payment.date_paiement == payment.date_paiement) & (Payment.created_at <= payment.created_at))
        )
        .count()
    )
    return f"{rank:04d}/{payment.date_paiement.year}"


def _signature_block() -> Table:
    row = [
        Paragraph("Le Caissier", ParagraphStyle("sig", fontName="Helvetica", fontSize=9, textColor=INK_SOFT)),
        "",
        Paragraph("Le Directeur / Cachet", ParagraphStyle("sig2", fontName="Helvetica", fontSize=9, textColor=INK_SOFT)),
    ]
    table = Table([row], colWidths=[65 * mm, 20 * mm, 65 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (0, 0), 0.6, INK_SOFT),
        ("LINEABOVE", (2, 0), (2, 0), 0.6, INK_SOFT),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def build_receipt_pdf(db: Session, payment: Payment, invoice: Invoice, student: Student, school: School) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=24 * mm, rightMargin=24 * mm, topMargin=20 * mm, bottomMargin=18 * mm,
        title=f"Reçu de paiement - {student.prenom} {student.nom}",
    )

    school_style = ParagraphStyle("school", fontName="Helvetica-Bold", fontSize=13, textColor=INK, spaceAfter=2)
    meta_style = ParagraphStyle("meta", fontName="Helvetica", fontSize=9, textColor=INK_SOFT)
    title_style = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, textColor=GOLD, spaceBefore=10, spaceAfter=6)
    ref_style = ParagraphStyle("ref", fontName="Helvetica-Bold", fontSize=10, textColor=INK, spaceAfter=2)
    ref_sub_style = ParagraphStyle("refsub", fontName="Helvetica", fontSize=9, textColor=INK_SOFT, spaceAfter=14)
    label_style = ParagraphStyle("label", fontName="Helvetica", fontSize=9.5, textColor=INK)
    words_style = ParagraphStyle("words", fontName="Helvetica-Oblique", fontSize=9.5, textColor=INK, spaceBefore=8, spaceAfter=2, leading=13)

    numero = _receipt_number(db, payment)
    classe = _current_classroom_name(db, student)
    fee_label = FEE_LABELS.get(invoice.type_frais.value, invoice.type_frais.value)

    elements = [
        Paragraph(school.nom, school_style),
        Paragraph((school.adresse or "") + (f" · {school.telephone}" if school.telephone else ""), meta_style),
        Paragraph("REÇU DE PAIEMENT", title_style),
        Paragraph(f"N° {numero}", ref_style),
        Paragraph(f"Délivré le {date.today().strftime('%d/%m/%Y')}", ref_sub_style),
    ]

    info_rows = [
        ["Reçu de", f"{student.prenom} {student.nom}"],
        ["Matricule", student.matricule],
        ["Classe", classe or "—"],
        ["Nature du paiement", fee_label],
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
    elements += [info_table, Spacer(1, 8 * mm)]

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

    words = amount_in_words(payment.montant)
    elements.append(Paragraph(f"Arrêté le présent reçu à la somme de : <b>{words} francs congolais</b>.", words_style))

    status_text = "Facture soldée." if invoice.reste_a_payer == 0 else "Paiement partiel — solde restant dû."
    elements += [Spacer(1, 4 * mm), Paragraph(status_text, label_style), Spacer(1, 16 * mm), _signature_block()]

    elements += [Spacer(1, 10 * mm), Paragraph(f"Reçu généré par Kelasi le {date.today().strftime('%d/%m/%Y')}.", meta_style)]

    # ---- Souche (talon conservé par l'établissement) ----
    elements.append(Spacer(1, 14 * mm))
    dash = Table([[""]], colWidths=[161 * mm])
    dash.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, 0), 0.6, RULE)]))
    # Dashed effect via a thin table border isn't native to reportlab tables, so a
    # plain hairline stands in for the perforation between the receipt and its stub.
    elements.append(dash)
    elements.append(Paragraph(
        "SOUCHE — À conserver par l'établissement",
        ParagraphStyle("stub-title", fontName="Helvetica-Bold", fontSize=8.5, textColor=INK_SOFT, spaceBefore=6, spaceAfter=4),
    ))
    stub_rows = [[
        f"N° {numero}", f"{student.prenom} {student.nom}", fee_label,
        format_money(payment.montant), payment.date_paiement.strftime("%d/%m/%Y"),
    ]]
    stub_table = Table(stub_rows, colWidths=[24 * mm, 55 * mm, 35 * mm, 27 * mm, 20 * mm], hAlign="LEFT")
    stub_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK_SOFT),
        ("ALIGN", (3, 0), (3, 0), "RIGHT"),
    ]))
    elements.append(stub_table)

    doc.build(elements)
    return buf.getvalue()
