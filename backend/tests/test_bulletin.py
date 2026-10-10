from datetime import date

from app.models.academic import AcademicYear, AcademicYearStatus, Cycle, EvaluationMode, Level, Term
from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session, email="admin.bulletin@test.cd"):
    school = School(nom="Bulletin School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()
    admin = User(
        school_id=school.id, nom="Admin", email=email, password_hash=hash_password("password123"),
        telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin)
    db_session.commit()
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123", "school_id": school.id})
    assert resp.status_code == 200
    return school


def make_term(db_session, school: School) -> Term:
    year = AcademicYear(
        school_id=school.id, libelle="2026-2027", date_debut=date(2026, 9, 1),
        date_fin=date(2027, 7, 15), statut=AcademicYearStatus.active,
    )
    db_session.add(year)
    db_session.flush()
    term = Term(school_id=school.id, academic_year_id=year.id, libelle="T1", date_debut=date(2026, 9, 1), date_fin=date(2026, 12, 15))
    db_session.add(term)
    db_session.commit()
    return term


def make_level(db_session, school: School, evaluation_mode=EvaluationMode.notes) -> str:
    cycle = Cycle(school_id=school.id, nom="Primaire", ordre=0, evaluation_mode=evaluation_mode)
    db_session.add(cycle)
    db_session.flush()
    level = Level(school_id=school.id, cycle_id=cycle.id, nom="6ème", ordre=0)
    db_session.add(level)
    db_session.commit()
    return level.id


def test_bulletin_pdf_with_notes(client, db_session):
    school = setup_school_admin(client, db_session)
    term = make_term(db_session, school)
    level_id = make_level(db_session, school)

    subject = client.post("/api/v1/subjects", json={"nom": "Mathématiques", "coefficient": 4}).json()["data"]
    classroom = client.post("/api/v1/classrooms", json={"level_id": level_id, "nom": "6ème A"}).json()["data"]
    student = client.post(
        "/api/v1/students",
        json={"matricule": "B-1", "nom": "Note", "prenom": "Un", "date_naissance": "2015-01-01", "classroom_id": classroom["id"]},
    ).json()["data"]
    assessment = client.post(
        "/api/v1/assessments",
        json={"subject_id": subject["id"], "classroom_id": classroom["id"], "term_id": term.id, "libelle": "Interro", "date": "2026-10-01"},
    ).json()["data"]
    client.put("/api/v1/grades", json={"records": [{"assessment_id": assessment["id"], "student_id": student["id"], "note": 15.5}]})

    resp = client.get(f"/api/v1/students/{student['id']}/bulletin.pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"

    scoped = client.get(f"/api/v1/students/{student['id']}/bulletin.pdf", params={"term_id": term.id})
    assert scoped.status_code == 200
    assert scoped.content[:4] == b"%PDF"


def test_bulletin_pdf_qualitatif_mode(client, db_session):
    school = setup_school_admin(client, db_session, email="admin.qual@test.cd")
    term = make_term(db_session, school)
    level_id = make_level(db_session, school, evaluation_mode=EvaluationMode.qualitatif)

    subject = client.post("/api/v1/subjects", json={"nom": "Éveil", "coefficient": 1}).json()["data"]
    classroom = client.post("/api/v1/classrooms", json={"level_id": level_id, "nom": "Petite Section"}).json()["data"]
    student = client.post(
        "/api/v1/students",
        json={"matricule": "B-2", "nom": "Petit", "prenom": "Elève", "date_naissance": "2020-01-01", "classroom_id": classroom["id"]},
    ).json()["data"]
    assessment = client.post(
        "/api/v1/assessments",
        json={"subject_id": subject["id"], "classroom_id": classroom["id"], "term_id": term.id, "libelle": "Observation", "date": "2026-10-01"},
    ).json()["data"]
    client.put(
        "/api/v1/grades",
        json={"records": [{"assessment_id": assessment["id"], "student_id": student["id"], "appreciation": "Participe bien en classe."}]},
    )

    resp = client.get(f"/api/v1/students/{student['id']}/bulletin.pdf")
    assert resp.status_code == 200
    assert resp.content[:4] == b"%PDF"


def test_parent_can_download_own_childs_bulletin(client, db_session):
    from app.models.people import Parent, StudentParent, Student as StudentModel

    school = setup_school_admin(client, db_session, email="admin.parentbull@test.cd")
    term = make_term(db_session, school)
    level_id = make_level(db_session, school)
    subject = client.post("/api/v1/subjects", json={"nom": "Français", "coefficient": 3}).json()["data"]
    classroom = client.post("/api/v1/classrooms", json={"level_id": level_id, "nom": "6ème B"}).json()["data"]
    student = client.post(
        "/api/v1/students",
        json={"matricule": "B-3", "nom": "Enfant", "prenom": "Test", "date_naissance": "2015-01-01", "classroom_id": classroom["id"]},
    ).json()["data"]

    parent_user = User(
        school_id=school.id, nom="Parent Test", email="parent.bull@test.cd",
        password_hash=hash_password("password123"), telephone="", role=Role.parent, statut=UserStatus.actif,
    )
    db_session.add(parent_user)
    db_session.flush()
    parent = Parent(school_id=school.id, user_id=parent_user.id, nom="Parent Test", telephone="", adresse="", profession="")
    db_session.add(parent)
    db_session.flush()
    db_session.add(StudentParent(school_id=school.id, student_id=student["id"], parent_id=parent.id))
    db_session.commit()

    client.post("/api/v1/auth/logout")
    login = client.post("/api/v1/auth/login", json={"email": "parent.bull@test.cd", "password": "password123", "school_id": school.id})
    assert login.status_code == 200

    resp = client.get(f"/api/v1/parent/children/{student['id']}/bulletin.pdf")
    assert resp.status_code == 200
    assert resp.content[:4] == b"%PDF"
