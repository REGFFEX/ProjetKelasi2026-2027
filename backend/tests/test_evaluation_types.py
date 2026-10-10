from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school(client, db_session, role: Role, email: str):
    school = School(nom="EvalType School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()
    user = User(
        school_id=school.id, nom="User", email=email, password_hash=hash_password("password123"),
        telephone="", role=role, statut=UserStatus.actif,
    )
    db_session.add(user)
    db_session.commit()
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123", "school_id": school.id})
    assert resp.status_code == 200
    return school


def test_secretary_can_create_evaluation_type(client, db_session):
    setup_school(client, db_session, Role.secretary, "secretary.evt@test.cd")
    resp = client.post("/api/v1/evaluation-types", json={"nom": "Composition"})
    assert resp.status_code == 200
    assert resp.json()["data"]["nom"] == "Composition"

    listed = client.get("/api/v1/evaluation-types").json()["data"]
    assert any(et["nom"] == "Composition" for et in listed)


def test_teacher_cannot_create_evaluation_type(client, db_session):
    setup_school(client, db_session, Role.teacher, "teacher.evt@test.cd")
    resp = client.post("/api/v1/evaluation-types", json={"nom": "Composition"})
    assert resp.status_code == 403
