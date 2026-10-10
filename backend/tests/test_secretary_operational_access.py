from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_with_secretary(client, db_session):
    """Director's role narrowed to strategic oversight — secretary now owns the
    day-to-day pedagogical structure, teacher records, and timetable."""
    school = School(nom="Delegated School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()
    secretary = User(
        school_id=school.id, nom="Secretaire", email="secretary.deleg@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.secretary, statut=UserStatus.actif,
    )
    db_session.add(secretary)
    db_session.commit()
    resp = client.post(
        "/api/v1/auth/login", json={"email": "secretary.deleg@test.cd", "password": "password123", "school_id": school.id}
    )
    assert resp.status_code == 200
    return school


def test_secretary_can_manage_pedagogical_structure(client, db_session):
    setup_school_with_secretary(client, db_session)

    cycle_resp = client.post(
        "/api/v1/cycles", json={"nom": "Secondaire", "ordre": 1, "evaluation_mode": "notes", "paiement_horaire": False}
    )
    assert cycle_resp.status_code == 200
    cycle = cycle_resp.json()["data"]

    level_resp = client.post("/api/v1/levels", json={"cycle_id": cycle["id"], "nom": "5eme", "ordre": 0})
    assert level_resp.status_code == 200
    level = level_resp.json()["data"]

    year_resp = client.post(
        "/api/v1/academic-years",
        json={"libelle": "2026-2027", "date_debut": "2026-09-01", "date_fin": "2027-07-15", "activate": True},
    )
    assert year_resp.status_code == 200

    subject_resp = client.post("/api/v1/subjects", json={"nom": "SVT", "coefficient": 2})
    assert subject_resp.status_code == 200
    subject = subject_resp.json()["data"]

    classroom_resp = client.post(
        "/api/v1/classrooms", json={"level_id": level["id"], "nom": "5eme A", "salle": "S3"}
    )
    assert classroom_resp.status_code == 200
    classroom = classroom_resp.json()["data"]

    teacher_resp = client.post(
        "/api/v1/teachers",
        json={"nom": "Prof", "prenom": "Deleg", "email": "prof.deleg@test.cd", "telephone": "", "assignments": []},
    )
    assert teacher_resp.status_code == 200
    teacher = teacher_resp.json()["data"]

    assignment_resp = client.post(
        "/api/v1/assignments",
        json={"teacher_id": teacher["id"], "subject_id": subject["id"], "classroom_id": classroom["id"]},
    )
    assert assignment_resp.status_code == 200
    assignment = assignment_resp.json()["data"]

    slot_resp = client.post(
        "/api/v1/timetable",
        json={"assignment_id": assignment["id"], "jour": "mardi", "heure_debut": "10:00:00", "heure_fin": "11:00:00"},
    )
    assert slot_resp.status_code == 200

    update_resp = client.patch(f"/api/v1/cycles/{cycle['id']}", json={"nom": "Secondaire (renomme)"})
    assert update_resp.status_code == 200
