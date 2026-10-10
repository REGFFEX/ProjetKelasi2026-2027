import time
from datetime import date

from app.models.academic import AcademicYear, AcademicYearStatus, Cycle, EvaluationMode, Level
from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session, email="admin.ts@test.cd"):
    school = School(nom="TS School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()
    admin = User(
        school_id=school.id, nom="Admin", email=email, password_hash=hash_password("password123"),
        telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin)
    year = AcademicYear(
        school_id=school.id, libelle="2026-2027", date_debut=date(2026, 9, 1), date_fin=date(2027, 7, 15),
        statut=AcademicYearStatus.active,
    )
    db_session.add(year)
    db_session.commit()
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123", "school_id": school.id})
    assert resp.status_code == 200
    return school


def make_level(db_session, school: School, paiement_horaire: bool) -> str:
    cycle = Cycle(
        school_id=school.id, nom="Lycee", ordre=0, evaluation_mode=EvaluationMode.notes,
        paiement_horaire=paiement_horaire,
    )
    db_session.add(cycle)
    db_session.flush()
    level = Level(school_id=school.id, cycle_id=cycle.id, nom="Terminale", ordre=0)
    db_session.add(level)
    db_session.commit()
    db_session.refresh(level)
    return level.id


def make_slot(client, level_id, teacher_email):
    subject = client.post("/api/v1/subjects", json={"nom": "Physique", "coefficient": 2}).json()["data"]
    classroom = client.post(
        "/api/v1/classrooms", json={"level_id": level_id, "nom": "Terminale C", "salle": "S1"}
    ).json()["data"]
    teacher = client.post(
        "/api/v1/teachers",
        json={"nom": "Prof", "prenom": "Un", "email": teacher_email, "telephone": "", "assignments": [], "password": "password123"},
    ).json()["data"]
    assignment = client.post(
        "/api/v1/assignments",
        json={"teacher_id": teacher["id"], "subject_id": subject["id"], "classroom_id": classroom["id"]},
    ).json()["data"]
    slot = client.post(
        "/api/v1/timetable",
        json={"assignment_id": assignment["id"], "jour": "lundi", "heure_debut": "08:00:00", "heure_fin": "09:00:00"},
    ).json()["data"]
    return teacher, slot


def login_as(client, email, school_id):
    client.post("/api/v1/auth/logout")
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123", "school_id": school_id})
    assert resp.status_code == 200


def test_start_rejected_when_cycle_not_hourly_paid(client, db_session):
    school = setup_school_admin(client, db_session)
    level_id = make_level(db_session, school, paiement_horaire=False)
    teacher, slot = make_slot(client, level_id, "prof1.ts@test.cd")

    login_as(client, "prof1.ts@test.cd", school.id)
    resp = client.post("/api/v1/teaching-sessions/start", json={"timetable_slot_id": slot["id"]})
    assert resp.status_code == 409


def test_full_session_and_report_flow(client, db_session):
    school = setup_school_admin(client, db_session)
    level_id = make_level(db_session, school, paiement_horaire=True)
    teacher, slot = make_slot(client, level_id, "prof2.ts@test.cd")

    # admin sets an hourly rate for this teacher
    rate_resp = client.post(
        "/api/v1/teaching-sessions/rates", json={"teacher_id": teacher["id"], "taux": 3000}
    )
    assert rate_resp.status_code == 200

    login_as(client, "prof2.ts@test.cd", school.id)
    start_resp = client.post("/api/v1/teaching-sessions/start", json={"timetable_slot_id": slot["id"]})
    assert start_resp.status_code == 200
    session = start_resp.json()["data"]
    assert session["statut"] == "en_cours"

    # starting again for the same slot while in progress is rejected
    dup_resp = client.post("/api/v1/teaching-sessions/start", json={"timetable_slot_id": slot["id"]})
    assert dup_resp.status_code == 409

    time.sleep(1.1)
    end_resp = client.post(f"/api/v1/teaching-sessions/{session['id']}/end")
    assert end_resp.status_code == 200
    ended = end_resp.json()["data"]
    assert ended["statut"] == "termine"
    assert ended["duree_reelle"] >= 1

    login_as(client, "admin.ts@test.cd", school.id)
    today = date.today()
    report_resp = client.get("/api/v1/teaching-sessions/report", params={"mois": today.month, "annee": today.year})
    assert report_resp.status_code == 200
    report = report_resp.json()["data"]
    assert len(report["lignes"]) == 1
    row = report["lignes"][0]
    assert row["teacher_id"] == teacher["id"]
    assert row["nb_seances"] == 1
    assert row["taux"] == 3000
    assert row["montant"] == round(row["total_heures"] * 3000, 0)


def test_teacher_cannot_end_someone_elses_session(client, db_session):
    school = setup_school_admin(client, db_session, email="admin3.ts@test.cd")
    level_id = make_level(db_session, school, paiement_horaire=True)
    teacher1, slot1 = make_slot(client, level_id, "prof3.ts@test.cd")

    login_as(client, "prof3.ts@test.cd", school.id)
    session = client.post("/api/v1/teaching-sessions/start", json={"timetable_slot_id": slot1["id"]}).json()["data"]

    # a second, unrelated teacher tries to end prof3's session
    client.post("/api/v1/auth/logout")
    client.post(
        "/api/v1/auth/login", json={"email": "admin3.ts@test.cd", "password": "password123", "school_id": school.id}
    )
    subject2 = client.post("/api/v1/subjects", json={"nom": "Chimie", "coefficient": 2}).json()["data"]
    classroom2 = client.post(
        "/api/v1/classrooms", json={"level_id": level_id, "nom": "Terminale D"}
    ).json()["data"]
    teacher2 = client.post(
        "/api/v1/teachers",
        json={"nom": "Deux", "prenom": "Prof", "email": "prof4.ts@test.cd", "telephone": "", "assignments": [], "password": "password123"},
    ).json()["data"]

    login_as(client, "prof4.ts@test.cd", school.id)
    resp = client.post(f"/api/v1/teaching-sessions/{session['id']}/end")
    assert resp.status_code == 403
