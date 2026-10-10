from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.finance import Payment, InvoiceStatus
from app.models.people import Student
from app.models.school import School
from app.models.user import Role
from app.pdf.receipt import build_receipt_pdf
from app.response import envelope, APIException
from app.routers.invoices import get_scoped_invoice
from app.schemas.finance import PaymentCreate, PaymentOut, InvoiceOut

router = APIRouter(prefix="/payments", tags=["payments"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant)
WRITE_ROLES = (Role.school_admin, Role.accountant)


@router.get("")
def list_payments(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    rows = (
        db.query(Payment)
        .filter(Payment.school_id == current_user.school_id)
        .order_by(Payment.date_paiement.desc())
        .all()
    )
    return envelope([PaymentOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_payment(
    body: PaymentCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    invoice = get_scoped_invoice(db, current_user, body.invoice_id)

    if body.montant > invoice.reste_a_payer:
        raise APIException(400, "Le montant dépasse le solde restant à payer.")

    new_reste = invoice.reste_a_payer - body.montant
    is_partial = new_reste > 0

    payment = Payment(
        school_id=current_user.school_id,
        invoice_id=invoice.id,
        montant=body.montant,
        date_paiement=body.date_paiement,
        mode_paiement=body.mode_paiement,
        partiel=is_partial,
    )
    db.add(payment)

    invoice.montant_paye += body.montant
    invoice.reste_a_payer = new_reste
    invoice.statut = InvoiceStatus.partiel if is_partial else InvoiceStatus.paye

    db.commit()
    db.refresh(payment)
    db.refresh(invoice)

    return envelope(
        {
            "payment": PaymentOut.model_validate(payment).model_dump(),
            "invoice": InvoiceOut.model_validate(invoice).model_dump(),
        },
        "Paiement enregistré.",
    )


@router.get("/{payment_id}/receipt.pdf")
def get_payment_receipt(
    payment_id: str,
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)
    if not payment or payment.school_id != current_user.school_id:
        raise APIException(404, "Paiement introuvable.")
    invoice = get_scoped_invoice(db, current_user, payment.invoice_id)
    student = db.get(Student, invoice.student_id)
    school = db.get(School, current_user.school_id)
    pdf_bytes = build_receipt_pdf(db, payment, invoice, student, school)
    filename = f"recu-{payment.id[:8]}.pdf"
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
