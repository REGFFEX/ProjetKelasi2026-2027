from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.school import School
from app.models.user import Role
from app.pdf.reports import build_report_pdf
from app.response import APIException

router = APIRouter(prefix="/reports", tags=["reports"])

VALID_TYPES = {"financial", "attendance", "grades"}


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
