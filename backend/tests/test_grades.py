from datetime import date

from app.models.academic import AcademicYear, AcademicYearStatus, Cycle, EvaluationMode, Level, Term
from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session):
    school = School(nom="Grades School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()

    admin = User(
        school_id=school.id, nom="Admin", email="admin.grades@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin)
    db_session.commit()

    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin.grades@test.cd", "password": "password123", "school_id": school.id},
    )
    assert resp.status_code == 200
    return school


def make_term(db_session, school: School) -> str:
    year = AcademicYear(
        school_id=school.id,
        libelle="2026-2027",
        date_debut=date(2026, 9, 1),
        date_fin=date(2027, 7, 15),
        statut=AcademicYearStatus.active,
    )
    db_session.add(year)
    db_session.flush()
    term = Term(
        school_id=school.id,
        academic_year_id=year.id,
        libelle="T1",
        date_debut=date(2026, 9, 1),
        date_fin=date(2026, 12, 15),
    )
    db_session.add(term)
    db_session.commit()
    db_session.refresh(term)
    return term.id


def make_level(db_session, school: School) -> str:
    cycle = Cycle(school_id=school.id, nom="Primaire", ordre=0, evaluation_mode=EvaluationMode.notes)
    db_session.add(cycle)
    db_session.flush()
    level = Level(school_id=school.id, cycle_id=cycle.id, nom="6ème", ordre=0)
    db_session.add(level)
    db_session.commit()
    db_session.refresh(level)
    return level.id


def test_grade_upsert_and_bulletin_math(client, db_session):
    school = setup_school_admin(client, db_session)
    term_id = make_term(db_session, school)
    level_id = make_level(db_session, school)

    subject_resp = client.post("/api/v1/subjects", json={"nom": "Mathématiques", "coefficient": 4})
    subject = subject_resp.json()["data"]

    classroom_resp = client.post(
        "/api/v1/classrooms", json={"level_id": level_id, "nom": "6ème A", "salle": "S1"}
    )
    classroom = classroom_resp.json()["data"]

    student_resp = client.post(
        "/api/v1/students",
        json={"matricule": "G-1", "nom": "Note", "prenom": "Un", "date_naissance": "2015-01-01"},
    )
    student = student_resp.json()["data"]

    assessment1 = client.post(
        "/api/v1/assessments",
        json={
            "subject_id": subject["id"],
            "classroom_id": classroom["id"],
            "term_id": term_id,
            "libelle": "Interro 1",
            "date": "2026-10-01",
            "coefficient": 1,
        },
    ).json()["data"]
    assessment2 = client.post(
        "/api/v1/assessments",
        json={
            "subject_id": subject["id"],
            "classroom_id": classroom["id"],
            "term_id": term_id,
            "libelle": "Examen T1",
            "date": "2026-12-01",
            "coefficient": 2,
        },
    ).json()["data"]

    upsert_resp = client.put(
        "/api/v1/grades",
        json={
            "records": [
                {"assessment_id": assessment1["id"], "student_id": student["id"], "note": 15.0},
                {"assessment_id": assessment2["id"], "student_id": student["id"], "note": 12.0},
            ]
        },
    )
    assert upsert_resp.status_code == 200

    grades_resp = client.get("/api/v1/grades", params={"assessment_id": assessment1["id"]})
    assert grades_resp.status_code == 200
    assert len(grades_resp.json()["data"]) == 1
    assert grades_resp.json()["data"][0]["note"] == 15.0

    all_grades = client.get("/api/v1/grades").json()["data"]
    by_assessment = {g["assessment_id"]: g["note"] for g in all_grades}

    # subjectAvg = sum(note * assessment.coefficient) / sum(coefficient) -- the frontend bulletin formula
    weighted_sum = by_assessment[assessment1["id"]] * assessment1["coefficient"] + by_assessment[
        assessment2["id"]
    ] * assessment2["coefficient"]
    total_coeff = assessment1["coefficient"] + assessment2["coefficient"]
    subject_avg = weighted_sum / total_coeff

    assert subject_avg == (15.0 * 1 + 12.0 * 2) / 3
    assert round(subject_avg, 2) == 13.0

    # Re-upsert (update path) with a corrected note for assessment1
    reupsert_resp = client.put(
        "/api/v1/grades",
        json={"records": [{"assessment_id": assessment1["id"], "student_id": student["id"], "note": 18.0}]},
    )
    assert reupsert_resp.status_code == 200
    updated = client.get("/api/v1/grades", params={"assessment_id": assessment1["id"]}).json()["data"]
    assert len(updated) == 1
    assert updated[0]["note"] == 18.0


def test_grade_note_out_of_range_rejected(client, db_session):
    school = setup_school_admin(client, db_session)
    term_id = make_term(db_session, school)
    level_id = make_level(db_session, school)
    subject = client.post("/api/v1/subjects", json={"nom": "Français", "coefficient": 4}).json()["data"]
    classroom = client.post(
        "/api/v1/classrooms", json={"level_id": level_id, "nom": "6ème B"}
    ).json()["data"]
    student = client.post(
        "/api/v1/students",
        json={"matricule": "G-2", "nom": "Hors", "prenom": "Norme", "date_naissance": "2015-01-01"},
    ).json()["data"]
    assessment = client.post(
        "/api/v1/assessments",
        json={
            "subject_id": subject["id"],
            "classroom_id": classroom["id"],
            "term_id": term_id,
            "libelle": "Interro",
            "date": "2026-10-01",
        },
    ).json()["data"]

    resp = client.put(
        "/api/v1/grades",
        json={"records": [{"assessment_id": assessment["id"], "student_id": student["id"], "note": 25.0}]},
    )
    assert resp.status_code == 422
