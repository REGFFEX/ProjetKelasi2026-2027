from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session, email="admin.csv@test.cd") -> School:
    school = School(nom="CSV School", adresse="Pointe-Noire", telephone="+242", date_creation=date(2024, 1, 1))
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


def test_export_students_csv(client, db_session):
    setup_school_admin(client, db_session)
    client.post("/api/v1/students", json={"matricule": "E-1", "nom": "Moutou", "prenom": "Alice", "date_naissance": "2015-01-01"})

    resp = client.get("/api/v1/students/export.csv")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    body = resp.content.decode("utf-8")
    assert "matricule,nom,prenom,date_naissance,classe,statut" in body
    assert "E-1,Moutou,Alice,2015-01-01" in body


def test_import_students_csv_partial_success(client, db_session):
    setup_school_admin(client, db_session, email="admin.csv2@test.cd")
    from app.models.academic import AcademicYear, AcademicYearStatus, Cycle, EvaluationMode, Level

    school = db_session.query(School).filter(School.nom == "CSV School").first()
    db_session.add(AcademicYear(
        school_id=school.id, libelle="2026-2027", date_debut=date(2026, 9, 1),
        date_fin=date(2027, 7, 15), statut=AcademicYearStatus.active,
    ))
    cycle = Cycle(school_id=school.id, nom="Primaire", ordre=0, evaluation_mode=EvaluationMode.notes)
    db_session.add(cycle)
    db_session.flush()
    level = Level(school_id=school.id, cycle_id=cycle.id, nom="6ème", ordre=0)
    db_session.add(level)
    db_session.commit()
    classroom = client.post("/api/v1/classrooms", json={"level_id": level.id, "nom": "6ème A"}).json()["data"]

    csv_content = (
        "matricule,nom,prenom,date_naissance,classe,statut\n"
        "I-1,Nkounkou,Jean,2015-03-04,6ème A,actif\n"
        "I-2,Bemba,Claire,2015-06-01,Classe Inconnue,actif\n"
        "I-3,Sans Prenom,,2015-01-01,,actif\n"
        "I-4,Loubaki,Marie,invalid-date,,actif\n"
    )
    resp = client.post(
        "/api/v1/students/import",
        files={"file": ("eleves.csv", csv_content.encode("utf-8"), "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    # I-1: clean create. I-2: created, but flagged since its class doesn't exist.
    # I-3: missing prénom, blocked. I-4: unparseable date, blocked.
    assert data["created"] == 2
    assert len(data["errors"]) == 3

    students = client.get("/api/v1/students").json()["data"]
    matricules = {s["matricule"] for s in students}
    assert "I-1" in matricules
    assert "I-2" in matricules
    assert "I-3" not in matricules
    assert "I-4" not in matricules


def test_import_requires_write_role(client, db_session):
    school = setup_school_admin(client, db_session, email="admin.csv3@test.cd")
    teacher = User(
        school_id=school.id, nom="Prof", email="prof.csv@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.teacher, statut=UserStatus.actif,
    )
    db_session.add(teacher)
    db_session.commit()
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "prof.csv@test.cd", "password": "password123", "school_id": school.id})

    resp = client.post(
        "/api/v1/students/import",
        files={"file": ("eleves.csv", b"matricule,nom,prenom,date_naissance\nX-1,A,B,2015-01-01\n", "text/csv")},
    )
    assert resp.status_code == 403
