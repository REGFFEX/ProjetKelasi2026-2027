from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import get_parent_row
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.finance import Invoice, Payment
from app.models.operations import Assessment, Attendance, Grade
from app.models.people import Student, StudentParent
from app.models.user import Role
from app.response import envelope, APIException
from app.routers.students import _serialize as serialize_student
from app.schemas.attendance import AttendanceOut
from app.schemas.finance import InvoiceOut, PaymentOut
from app.schemas.grades import AssessmentOut, GradeOut

router = APIRouter(prefix="/parent", tags=["parent"])


def _own_children_ids(db: Session, current_user: CurrentUser) -> list[str]:
    parent = get_parent_row(db, current_user)
    return [
        link.student_id
        for link in db.query(StudentParent).filter(StudentParent.parent_id == parent.id).all()
    ]


def _assert_own_child(db: Session, current_user: CurrentUser, student_id: str) -> Student:
    if student_id not in _own_children_ids(db, current_user):
        raise APIException(404, "Élève introuvable.")
    student = db.get(Student, student_id)
    if not student:
        raise APIException(404, "Élève introuvable.")
    return student


@router.get("/children")
def list_children(
    current_user: CurrentUser = Depends(require_role(Role.parent)), db: Session = Depends(get_db)
):
    ids = _own_children_ids(db, current_user)
    students = db.query(Student).filter(Student.id.in_(ids)).all() if ids else []
    return envelope([serialize_student(db, current_user, s) for s in students])


@router.get("/children/{student_id}/grades")
def child_grades(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(Role.parent)),
    db: Session = Depends(get_db),
):
    _assert_own_child(db, current_user, student_id)
    rows = db.query(Grade).filter(Grade.student_id == student_id).all()
    return envelope([GradeOut.model_validate(r).model_dump() for r in rows])


@router.get("/children/{student_id}/assessments")
def child_assessments(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(Role.parent)),
    db: Session = Depends(get_db),
):
    student = _assert_own_child(db, current_user, student_id)
    grade_assessment_ids = [
        g.assessment_id for g in db.query(Grade.assessment_id).filter(Grade.student_id == student.id).all()
    ]
    rows = (
        db.query(Assessment).filter(Assessment.id.in_(grade_assessment_ids)).all() if grade_assessment_ids else []
    )
    return envelope([AssessmentOut.model_validate(r).model_dump() for r in rows])


@router.get("/children/{student_id}/attendance")
def child_attendance(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(Role.parent)),
    db: Session = Depends(get_db),
):
    _assert_own_child(db, current_user, student_id)
    rows = db.query(Attendance).filter(Attendance.student_id == student_id).order_by(Attendance.date.desc()).all()
    return envelope([AttendanceOut.model_validate(r).model_dump() for r in rows])


@router.get("/children/{student_id}/invoices")
def child_invoices(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(Role.parent)),
    db: Session = Depends(get_db),
):
    _assert_own_child(db, current_user, student_id)
    rows = db.query(Invoice).filter(Invoice.student_id == student_id).all()
    return envelope([InvoiceOut.model_validate(r).model_dump() for r in rows])


@router.get("/children/{student_id}/payments")
def child_payments(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(Role.parent)),
    db: Session = Depends(get_db),
):
    _assert_own_child(db, current_user, student_id)
    invoice_ids = [i.id for i in db.query(Invoice.id).filter(Invoice.student_id == student_id).all()]
    rows = db.query(Payment).filter(Payment.invoice_id.in_(invoice_ids)).all() if invoice_ids else []
    return envelope([PaymentOut.model_validate(r).model_dump() for r in rows])
