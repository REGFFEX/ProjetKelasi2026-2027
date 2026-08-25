from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session, email="admin.announce@test.cd") -> School:
    school = School(nom="Announce School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
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


def test_admin_can_create_list_and_delete_announcement(client, db_session):
    setup_school_admin(client, db_session)

    created = client.post(
        "/api/v1/announcements",
        json={"titre": "Réunion parents", "contenu": "Réunion le 5 septembre.", "cible": "parents"},
    )
    assert created.status_code == 200
    data = created.json()["data"]
    assert data["titre"] == "Réunion parents"
    assert data["auteur_nom"] == "Admin"
    announcement_id = data["id"]

    listed = client.get("/api/v1/announcements")
    assert listed.status_code == 200
    assert len(listed.json()["data"]) == 1

    deleted = client.delete(f"/api/v1/announcements/{announcement_id}")
    assert deleted.status_code == 200
    assert client.get("/api/v1/announcements").json()["data"] == []


def test_all_roles_can_read_but_only_staff_can_write(client, db_session):
    school = setup_school_admin(client, db_session, email="admin.announce2@test.cd")
    client.post("/api/v1/announcements", json={"titre": "Info", "contenu": "Contenu.", "cible": "tous"})

    teacher = User(
        school_id=school.id, nom="Prof", email="prof.announce@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.teacher, statut=UserStatus.actif,
    )
    db_session.add(teacher)
    db_session.commit()
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "prof.announce@test.cd", "password": "password123", "school_id": school.id})

    read = client.get("/api/v1/announcements")
    assert read.status_code == 200
    assert len(read.json()["data"]) == 1

    blocked = client.post("/api/v1/announcements", json={"titre": "X", "contenu": "Y", "cible": "tous"})
    assert blocked.status_code == 403


def test_announcements_isolated_between_schools(client, db_session):
    setup_school_admin(client, db_session, email="admin.announce3@test.cd")
    client.post("/api/v1/announcements", json={"titre": "École A", "contenu": "Contenu A.", "cible": "tous"})
    client.post("/api/v1/auth/logout")

    setup_school_admin(client, db_session, email="admin.announce4@test.cd")
    read = client.get("/api/v1/announcements")
    assert read.json()["data"] == []
