from datetime import date

from app.models.academic import AcademicYear, AcademicYearStatus, Cycle, EvaluationMode, Level, Term
from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session):
    school = School(nom="Delib School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()

    admin = User(
        school_id=school.id, nom="Admin", email="admin.delib@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin)
    db_session.commit()

    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin.delib@test.cd", "password": "password123", "school_id": school.id},
    )
    assert resp.status_code == 200
    return school


def make_term(db_session, school: School) -> str:
    year = AcademicYear(
        school_id=school.id, libelle="2026-2027", date_debut=date(2026, 9, 1), date_fin=date(2027, 7, 15),
        statut=AcademicYearStatus.active,
    )
    db_session.add(year)
    db_session.flush()
    term = Term(
        school_id=school.id, academic_year_id=year.id, libelle="T1",
        date_debut=date(2026, 9, 1), date_fin=date(2026, 12, 15),
    )
    db_session.add(term)
    db_session.commit()
    db_session.refresh(term)
    return term.id


def make_level(db_session, school: School) -> str:
    cycle = Cycle(school_id=school.id, nom="College", ordre=0, evaluation_mode=EvaluationMode.notes)
    db_session.add(cycle)
    db_session.flush()
    level = Level(school_id=school.id, cycle_id=cycle.id, nom="6eme", ordre=0)
    db_session.add(level)
    db_session.commit()
    db_session.refresh(level)
    return level.id


def test_deliberation_ranks_and_decides(client, db_session):
    school = setup_school_admin(client, db_session)
    term_id = make_term(db_session, school)
    level_id = make_level(db_session, school)

    subject = client.post("/api/v1/subjects", json={"nom": "Maths", "coefficient": 2}).json()["data"]
    classroom = client.post(
        "/api/v1/classrooms", json={"level_id": level_id, "nom": "6eme A", "salle": "S1"}
    ).json()["data"]

    top_student = client.post(
        "/api/v1/students",
        json={"matricule": "D-1", "nom": "Haut", "prenom": "Eleve", "date_naissance": "2015-01-01",
              "classroom_id": classroom["id"]},
    ).json()["data"]
    low_student = client.post(
        "/api/v1/students",
        json={"matricule": "D-2", "nom": "Bas", "prenom": "Eleve", "date_naissance": "2015-01-01",
              "classroom_id": classroom["id"]},
    ).json()["data"]
    absent_student = client.post(
        "/api/v1/students",
        json={"matricule": "D-3", "nom": "Absent", "prenom": "Eleve", "date_naissance": "2015-01-01",
              "classroom_id": classroom["id"]},
    ).json()["data"]

    assessment = client.post(
        "/api/v1/assessments",
        json={
            "subject_id": subject["id"], "classroom_id": classroom["id"], "term_id": term_id,
            "libelle": "Devoir", "date": "2026-10-01", "coefficient": 1,
        },
    ).json()["data"]

    client.put(
        "/api/v1/grades",
        json={"records": [
            {"assessment_id": assessment["id"], "student_id": top_student["id"], "note": 16.0},
            {"assessment_id": assessment["id"], "student_id": low_student["id"], "note": 5.0},
        ]},
    )

    resp = client.get(
        "/api/v1/reports/deliberation",
        params={"classroom_id": classroom["id"], "term_id": term_id, "seuil": 10},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    by_id = {r["student_id"]: r for r in data["resultats"]}
    assert by_id[top_student["id"]]["decision"] == "admis"
    assert by_id[top_student["id"]]["rang"] == 1
    assert by_id[low_student["id"]]["decision"] == "echoue"
    assert by_id[low_student["id"]]["rang"] is None
    assert by_id[absent_student["id"]]["decision"] == "absent"
    assert by_id[absent_student["id"]]["moyenne"] is None

    assert data["nb_admis"] == 1
    assert data["nb_echoue"] == 1
    assert data["nb_absent"] == 1
    assert data["moyenne_classe"] == round((16.0 + 5.0) / 2, 2)


def test_deliberation_requires_school_admin_or_secretary(client, db_session):
    school = setup_school_admin(client, db_session)
    level_id = make_level(db_session, school)
    classroom = client.post(
        "/api/v1/classrooms", json={"level_id": level_id, "nom": "6eme B"}
    ).json()["data"]

    teacher = User(
        school_id=school.id, nom="Prof", email="prof.delib@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.teacher, statut=UserStatus.actif,
    )
    db_session.add(teacher)
    db_session.commit()
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "prof.delib@test.cd", "password": "password123", "school_id": school.id})

    resp = client.get("/api/v1/reports/deliberation", params={"classroom_id": classroom["id"]})
    assert resp.status_code == 403
