from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.finance import Invoice, InvoiceStatus
from app.models.user import Role
from app.response import envelope, APIException
from app.schemas.finance import InvoiceCreate, InvoiceOut

router = APIRouter(prefix="/invoices", tags=["invoices"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant)
WRITE_ROLES = (Role.school_admin, Role.accountant)


@router.get("")
def list_invoices(current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)):
    rows = (
        db.query(Invoice)
        .filter(Invoice.school_id == current_user.school_id)
        .order_by(Invoice.date_emission.desc())
        .all()
    )
    return envelope([InvoiceOut.model_validate(r).model_dump() for r in rows])


@router.post("")
def create_invoice(
    body: InvoiceCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = Invoice(
        school_id=current_user.school_id,
        student_id=body.student_id,
        type_frais=body.type_frais,
        montant_total=body.montant_total,
        montant_paye=0,
        reste_a_payer=body.montant_total,
        date_emission=body.date_emission,
        statut=InvoiceStatus.impaye,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return envelope(InvoiceOut.model_validate(row).model_dump(), "Facture créée.")


def get_scoped_invoice(db: Session, current_user: CurrentUser, invoice_id: str) -> Invoice:
    row = db.get(Invoice, invoice_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Facture introuvable.")
    return row
