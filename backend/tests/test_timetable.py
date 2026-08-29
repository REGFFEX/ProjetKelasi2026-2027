from datetime import date

from app.models.academic import AcademicYear, AcademicYearStatus, Cycle, EvaluationMode, Level
from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session, email="admin.timetable@test.cd"):
    school = School(nom="TT School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
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


def make_level(db_session, school: School) -> str:
    cycle = Cycle(school_id=school.id, nom="College", ordre=0, evaluation_mode=EvaluationMode.notes)
    db_session.add(cycle)
    db_session.flush()
    level = Level(school_id=school.id, cycle_id=cycle.id, nom="6eme", ordre=0)
    db_session.add(level)
    db_session.commit()
    db_session.refresh(level)
    return level.id


def make_assignment(client, db_session, school, level_id, teacher_email, classroom_nom="6eme A"):
    subject = client.post("/api/v1/subjects", json={"nom": "Maths", "coefficient": 2}).json()["data"]
    classroom = client.post(
        "/api/v1/classrooms", json={"level_id": level_id, "nom": classroom_nom, "salle": "S1"}
    ).json()["data"]
    teacher = client.post(
        "/api/v1/teachers",
        json={"nom": "Prof", "prenom": "Un", "email": teacher_email, "telephone": "", "assignments": []},
    ).json()["data"]
    assignment = client.post(
        "/api/v1/assignments",
        json={"teacher_id": teacher["id"], "subject_id": subject["id"], "classroom_id": classroom["id"]},
    ).json()["data"]
    return assignment, classroom, teacher


def test_create_and_list_timetable_slot(client, db_session):
    school = setup_school_admin(client, db_session)
    level_id = make_level(db_session, school)
    assignment, classroom, _ = make_assignment(client, db_session, school, level_id, "prof1.tt@test.cd")

    resp = client.post(
        "/api/v1/timetable",
        json={"assignment_id": assignment["id"], "jour": "lundi", "heure_debut": "08:00:00", "heure_fin": "09:00:00", "salle": "S1"},
    )
    assert resp.status_code == 200
    slot = resp.json()["data"]
    assert slot["jour"] == "lundi"

    listed = client.get("/api/v1/timetable", params={"classroom_id": classroom["id"]}).json()["data"]
    assert len(listed) == 1
    assert listed[0]["id"] == slot["id"]


def test_overlap_same_teacher_rejected(client, db_session):
    school = setup_school_admin(client, db_session)
    level_id = make_level(db_session, school)
    assignment, _, teacher = make_assignment(client, db_session, school, level_id, "prof2.tt@test.cd")

    # a second assignment for the SAME teacher, different subject/classroom
    subject2 = client.post("/api/v1/subjects", json={"nom": "Physique", "coefficient": 2}).json()["data"]
    classroom2 = client.post(
        "/api/v1/classrooms", json={"level_id": level_id, "nom": "6eme B", "salle": "S2"}
    ).json()["data"]
    assignment2 = client.post(
        "/api/v1/assignments",
        json={"teacher_id": teacher["id"], "subject_id": subject2["id"], "classroom_id": classroom2["id"]},
    ).json()["data"]

    client.post(
        "/api/v1/timetable",
        json={"assignment_id": assignment["id"], "jour": "mardi", "heure_debut": "10:00:00", "heure_fin": "11:00:00"},
    )
    resp = client.post(
        "/api/v1/timetable",
        json={"assignment_id": assignment2["id"], "jour": "mardi", "heure_debut": "10:30:00", "heure_fin": "11:30:00"},
    )
    assert resp.status_code == 409


def test_teacher_only_sees_own_slots(client, db_session):
    school = setup_school_admin(client, db_session)
    level_id = make_level(db_session, school)
    assignment, _, _ = make_assignment(client, db_session, school, level_id, "prof3.tt@test.cd")
    client.post(
        "/api/v1/timetable",
        json={"assignment_id": assignment["id"], "jour": "mercredi", "heure_debut": "08:00:00", "heure_fin": "09:00:00"},
    )

    # a second, unrelated teacher with no assignment at all
    client.post(
        "/api/v1/teachers",
        json={"nom": "Autre", "prenom": "Prof", "email": "other.tt@test.cd", "telephone": "", "assignments": [], "password": "password123"},
    )
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "other.tt@test.cd", "password": "password123", "school_id": school.id})

    resp = client.get("/api/v1/timetable")
    assert resp.status_code == 200
    assert resp.json()["data"] == []


def test_write_requires_school_admin(client, db_session):
    school = setup_school_admin(client, db_session, email="admin2.tt@test.cd")
    level_id = make_level(db_session, school)
    assignment, _, _ = make_assignment(client, db_session, school, level_id, "prof4.tt@test.cd")

    secretary = User(
        school_id=school.id, nom="Secr", email="secretary.tt@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.secretary, statut=UserStatus.actif,
    )
    db_session.add(secretary)
    db_session.commit()
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "secretary.tt@test.cd", "password": "password123", "school_id": school.id})

    resp = client.post(
        "/api/v1/timetable",
        json={"assignment_id": assignment["id"], "jour": "jeudi", "heure_debut": "08:00:00", "heure_fin": "09:00:00"},
    )
    assert resp.status_code == 403
