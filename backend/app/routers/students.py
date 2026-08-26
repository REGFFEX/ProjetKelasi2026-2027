import csv
import io
from datetime import date, datetime

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.authz import get_active_academic_year_or_none, write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.file_storage import save_image_upload
from app.models.academic import Term
from app.models.people import Classroom, Student, Parent, StudentParent, Enrollment
from app.models.school import School
from app.models.user import Role, UserStatus
from app.pdf.bulletin import build_bulletin_pdf
from app.pdf.certificate import build_certificate_pdf
from app.pdf.id_card import build_id_card_pdf
from app.response import envelope, APIException
from app.schemas.students import StudentCreate, StudentUpdate, StudentOut, StudentParentsSet
from app.schemas.parents import ParentOut

router = APIRouter(prefix="/students", tags=["students"])

READ_ROLES = (Role.school_admin, Role.secretary, Role.accountant, Role.teacher)
WRITE_ROLES = (Role.school_admin, Role.secretary)


def _current_classroom_id(db: Session, school_id: str, student_id: str) -> str | None:
    year = get_active_academic_year_or_none(db, school_id)
    if not year:
        return None
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student_id, Enrollment.academic_year_id == year.id)
        .first()
    )
    return enrollment.classroom_id if enrollment else None


def _serialize(db: Session, current_user: CurrentUser, student: Student) -> dict:
    out = StudentOut(
        id=student.id,
        school_id=student.school_id,
        matricule=student.matricule,
        nom=student.nom,
        prenom=student.prenom,
        date_naissance=student.date_naissance,
        photo=student.photo,
        classroom_id=_current_classroom_id(db, current_user.school_id, student.id),
        statut=student.statut,
        created_at=student.created_at,
    )
    return out.model_dump(mode="json")


def _set_enrollment(db: Session, current_user: CurrentUser, student_id: str, classroom_id: str | None) -> None:
    if classroom_id is None:
        return
    year = get_active_academic_year_or_none(db, current_user.school_id)
    if not year:
        raise APIException(409, "Aucune année scolaire active pour cette école.")
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student_id, Enrollment.academic_year_id == year.id)
        .first()
    )
    if enrollment:
        enrollment.classroom_id = classroom_id
    else:
        db.add(
            Enrollment(
                school_id=current_user.school_id,
                student_id=student_id,
                classroom_id=classroom_id,
                academic_year_id=year.id,
            )
        )


@router.get("")
def list_students(
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)
):
    students = (
        db.query(Student).filter(Student.school_id == current_user.school_id).order_by(Student.nom).all()
    )
    return envelope([_serialize(db, current_user, s) for s in students])


@router.get("/parent-links")
def list_all_student_parents(
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)), db: Session = Depends(get_db)
):
    links = db.query(StudentParent).filter(StudentParent.school_id == current_user.school_id).all()
    return envelope(
        [
            {"id": l.id, "school_id": l.school_id, "student_id": l.student_id, "parent_id": l.parent_id}
            for l in links
        ]
    )


CSV_COLUMNS = ["matricule", "nom", "prenom", "date_naissance", "classe", "statut"]


@router.get("/export.csv")
def export_students_csv(
    current_user: CurrentUser = Depends(require_role(Role.school_admin, Role.secretary)),
    db: Session = Depends(get_db),
):
    students = (
        db.query(Student).filter(Student.school_id == current_user.school_id).order_by(Student.nom).all()
    )
    classroom_ids = {_current_classroom_id(db, current_user.school_id, s.id) for s in students}
    classroom_ids.discard(None)
    classrooms = {c.id: c.nom for c in db.query(Classroom).filter(Classroom.id.in_(classroom_ids)).all()} if classroom_ids else {}

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_COLUMNS)
    for s in students:
        classroom_id = _current_classroom_id(db, current_user.school_id, s.id)
        writer.writerow([
            s.matricule, s.nom, s.prenom, s.date_naissance.isoformat(),
            classrooms.get(classroom_id, ""), s.statut.value,
        ])
    return Response(
        content=buf.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="eleves.csv"'},
    )


@router.post("/import")
async def import_students_csv(
    file: UploadFile,
    current_user: CurrentUser = Depends(require_role(Role.school_admin, Role.secretary)),
    db: Session = Depends(get_db),
):
    raw = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    if reader.fieldnames is None:
        raise APIException(400, "Fichier CSV vide ou illisible.")
    headers = {(h or "").strip().lower() for h in reader.fieldnames}
    if not {"matricule", "nom", "prenom", "date_naissance"}.issubset(headers):
        raise APIException(400, "Colonnes attendues : matricule, nom, prenom, date_naissance, classe, statut.")

    classrooms_by_name = {
        c.nom.strip().lower(): c.id
        for c in db.query(Classroom).filter(Classroom.school_id == current_user.school_id).all()
    }

    created, errors = 0, []
    for i, row in enumerate(reader, start=2):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        try:
            # A savepoint per row: a failure here rolls back only this row, not
            # the students already committed earlier in the same import.
            with db.begin_nested():
                if not row.get("matricule") or not row.get("nom") or not row.get("prenom"):
                    raise ValueError("matricule, nom et prénom sont requis.")
                try:
                    naissance = datetime.strptime(row["date_naissance"], "%Y-%m-%d").date()
                except ValueError:
                    raise ValueError("date_naissance doit être au format AAAA-MM-JJ.")
                statut = UserStatus.inactif if row.get("statut", "").lower().startswith("inactif") else UserStatus.actif

                student = Student(
                    school_id=current_user.school_id, matricule=row["matricule"], nom=row["nom"],
                    prenom=row["prenom"], date_naissance=naissance, statut=statut,
                )
                db.add(student)
                db.flush()

                classe = row.get("classe", "")
                classroom_id = classrooms_by_name.get(classe.lower()) if classe else None
                if classe and not classroom_id:
                    errors.append({"row": i, "message": f"Classe « {classe} » introuvable — élève créé sans classe."})
                elif classroom_id:
                    _set_enrollment(db, current_user, student.id, classroom_id)

            created += 1
        except ValueError as e:
            errors.append({"row": i, "message": str(e)})
        except Exception:
            errors.append({"row": i, "message": "Ligne invalide."})

    write_audit_log(db, current_user, "IMPORT_STUDENTS", "student", "bulk", new_value={"created": created, "errors": len(errors)})
    db.commit()
    return envelope({"created": created, "errors": errors}, f"{created} élève(s) importé(s).")


@router.get("/{student_id}")
def get_student(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    return envelope(_serialize(db, current_user, student))


@router.post("")
def create_student(
    body: StudentCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude={"classroom_id"})
    student = Student(school_id=current_user.school_id, **data)
    db.add(student)
    db.flush()
    _set_enrollment(db, current_user, student.id, body.classroom_id)
    db.commit()
    db.refresh(student)
    return envelope(_serialize(db, current_user, student), "Élève créé.")


@router.post("/{student_id}/photo")
async def upload_student_photo(
    student_id: str,
    file: UploadFile,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    student.photo = await save_image_upload(file, "photos")
    write_audit_log(db, current_user, "UPDATE_STUDENT_PHOTO", "student", student.id)
    db.commit()
    db.refresh(student)
    return envelope(_serialize(db, current_user, student), "Photo mise à jour.")


@router.patch("/{student_id}")
def update_student(
    student_id: str,
    body: StudentUpdate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    updates = body.model_dump(exclude_unset=True, exclude={"classroom_id"})
    for field, value in updates.items():
        setattr(student, field, value)
    if "classroom_id" in body.model_fields_set:
        _set_enrollment(db, current_user, student.id, body.classroom_id)
    db.commit()
    db.refresh(student)
    return envelope(_serialize(db, current_user, student), "Élève mis à jour.")


@router.delete("/{student_id}")
def delete_student(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    db.delete(student)
    db.commit()
    return envelope(None, "Élève supprimé.")


@router.get("/{student_id}/parents")
def get_student_parents(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    _get_scoped(db, current_user, student_id)
    links = db.query(StudentParent).filter(StudentParent.student_id == student_id).all()
    parent_ids = [link.parent_id for link in links]
    parents = db.query(Parent).filter(Parent.id.in_(parent_ids)).all() if parent_ids else []
    return envelope([ParentOut.model_validate(p).model_dump() for p in parents])


@router.put("/{student_id}/parents")
def set_student_parents(
    student_id: str,
    body: StudentParentsSet,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    _get_scoped(db, current_user, student_id)
    db.query(StudentParent).filter(StudentParent.student_id == student_id).delete()
    for parent_id in body.parent_ids:
        db.add(StudentParent(school_id=current_user.school_id, student_id=student_id, parent_id=parent_id))
    db.commit()
    return envelope(None, "Parents liés à l'élève.")


@router.get("/{student_id}/bulletin.pdf")
def get_student_bulletin(
    student_id: str,
    term_id: str | None = None,
    current_user: CurrentUser = Depends(require_role(Role.school_admin, Role.secretary)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    school = db.get(School, current_user.school_id)
    term = None
    if term_id:
        term = db.get(Term, term_id)
        if not term or term.school_id != current_user.school_id:
            raise APIException(404, "Période introuvable.")
    pdf_bytes = build_bulletin_pdf(db, student, school, term)
    filename = f"bulletin-{student.matricule}.pdf"
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{student_id}/certificate.pdf")
def get_student_certificate(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(Role.school_admin, Role.secretary)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    school = db.get(School, current_user.school_id)
    pdf_bytes = build_certificate_pdf(db, student, school)
    filename = f"certificat-scolarite-{student.matricule}.pdf"
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{student_id}/id-card.pdf")
def get_student_id_card(
    student_id: str,
    current_user: CurrentUser = Depends(require_role(Role.school_admin, Role.secretary)),
    db: Session = Depends(get_db),
):
    student = _get_scoped(db, current_user, student_id)
    school = db.get(School, current_user.school_id)
    pdf_bytes = build_id_card_pdf(db, student, school)
    filename = f"carte-scolaire-{student.matricule}.pdf"
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _get_scoped(db: Session, current_user: CurrentUser, student_id: str) -> Student:
    student = db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise APIException(404, "Élève introuvable.")
    return student
