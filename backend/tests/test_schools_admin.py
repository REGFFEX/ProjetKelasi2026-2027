from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def make_super_admin(db_session) -> None:
    u = User(
        school_id=None, nom="Super Admin", email="super@test.cd",
        password_hash=hash_password("password123"), telephone="", role=Role.super_admin, statut=UserStatus.actif,
    )
    db_session.add(u)
    db_session.commit()


def test_super_admin_can_list_and_manage_schools(client, db_session):
    db_session.add(School(nom="École A", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1)))
    db_session.commit()
    make_super_admin(db_session)

    login = client.post("/api/v1/auth/login", json={"email": "super@test.cd", "password": "password123"})
    assert login.status_code == 200

    listed = client.get("/api/v1/admin/schools")
    assert listed.status_code == 200
    assert len(listed.json()["data"]) == 1

    created = client.post(
        "/api/v1/admin/schools",
        json={"nom": "École B", "adresse": "Lubumbashi", "statut_abonnement": "essai"},
    )
    assert created.status_code == 200
    school_id = created.json()["data"]["id"]

    updated = client.patch(f"/api/v1/admin/schools/{school_id}", json={"statut_abonnement": "actif"})
    assert updated.status_code == 200
    assert updated.json()["data"]["statut_abonnement"] == "actif"

    listed_again = client.get("/api/v1/admin/schools")
    assert len(listed_again.json()["data"]) == 2


def test_non_super_admin_cannot_manage_schools(client, db_session):
    school = School(nom="École C", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()

    admin = User(
        school_id=school.id, nom="Admin", email="admin.c@test.cd",
        password_hash=hash_password("password123"), telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin)
    db_session.commit()

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin.c@test.cd", "password": "password123", "school_id": school.id},
    )
    assert login.status_code == 200

    resp = client.get("/api/v1/admin/schools")
    assert resp.status_code == 403
