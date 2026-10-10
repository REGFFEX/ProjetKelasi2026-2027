from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def make_school_and_admin(client, db_session) -> School:
    school = School(nom="Self Service School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()
    admin = User(
        school_id=school.id, nom="Admin", email="admin@selfservice.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin)
    db_session.commit()
    resp = client.post(
        "/api/v1/auth/login", json={"email": "admin@selfservice.cd", "password": "password123", "school_id": school.id}
    )
    assert resp.status_code == 200
    return school


def test_school_admin_can_view_and_update_own_school(client, db_session):
    school = make_school_and_admin(client, db_session)

    me = client.get("/api/v1/schools/me")
    assert me.status_code == 200
    assert me.json()["data"]["nom"] == "Self Service School"

    updated = client.patch(
        "/api/v1/schools/me", json={"nom": "École Renommée", "adresse": "Lubumbashi", "telephone": "+243 99"}
    )
    assert updated.status_code == 200
    body = updated.json()["data"]
    assert body["nom"] == "École Renommée"
    assert body["adresse"] == "Lubumbashi"

    # subscription status is not editable through this endpoint
    unchanged = client.get("/api/v1/schools/me").json()["data"]
    assert unchanged["statut_abonnement"] == "actif"


def test_non_admin_cannot_update_school(client, db_session):
    school = make_school_and_admin(client, db_session)
    teacher = User(
        school_id=school.id, nom="Prof", email="prof@selfservice.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.teacher, statut=UserStatus.actif,
    )
    db_session.add(teacher)
    db_session.commit()

    client.post("/api/v1/auth/logout")
    client.post(
        "/api/v1/auth/login", json={"email": "prof@selfservice.cd", "password": "password123", "school_id": school.id}
    )
    resp = client.patch("/api/v1/schools/me", json={"nom": "Hacked"})
    assert resp.status_code == 403
