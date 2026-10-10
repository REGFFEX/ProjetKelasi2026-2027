from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password
from datetime import date


def make_super_admin_and_login(client, db_session, email="root@platform.cd") -> User:
    u = User(
        school_id=None, nom="Root Admin", email=email,
        password_hash=hash_password("password123"), telephone="", role=Role.super_admin, statut=UserStatus.actif,
    )
    db_session.add(u)
    db_session.commit()
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert resp.status_code == 200
    return u


def test_super_admin_can_manage_other_super_admins(client, db_session):
    make_super_admin_and_login(client, db_session)

    created = client.post(
        "/api/v1/admin/super-admins",
        json={"nom": "Second Admin", "email": "second@platform.cd", "password": "password123"},
    )
    assert created.status_code == 200
    new_id = created.json()["data"]["id"]
    assert created.json()["data"]["role"] == "super_admin"
    assert created.json()["data"]["school_id"] is None

    listed = client.get("/api/v1/admin/super-admins")
    assert listed.status_code == 200
    assert len(listed.json()["data"]) == 2

    # new admin can log in
    client.post("/api/v1/auth/logout")
    login = client.post("/api/v1/auth/login", json={"email": "second@platform.cd", "password": "password123"})
    assert login.status_code == 200

    # back as root: deactivate the second admin
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "root@platform.cd", "password": "password123"})
    deactivated = client.patch(f"/api/v1/admin/super-admins/{new_id}", json={"statut": "inactif"})
    assert deactivated.status_code == 200

    client.post("/api/v1/auth/logout")
    blocked = client.post("/api/v1/auth/login", json={"email": "second@platform.cd", "password": "password123"})
    assert blocked.status_code == 403


def test_cannot_deactivate_last_active_super_admin(client, db_session):
    root = make_super_admin_and_login(client, db_session)
    resp = client.patch(f"/api/v1/admin/super-admins/{root.id}", json={"statut": "inactif"})
    assert resp.status_code == 400


def test_school_admin_cannot_manage_super_admins(client, db_session):
    school = School(nom="Not Platform", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()
    admin = User(
        school_id=school.id, nom="Admin", email="admin@notplatform.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin)
    db_session.commit()
    client.post("/api/v1/auth/login", json={"email": "admin@notplatform.cd", "password": "password123", "school_id": school.id})

    resp = client.get("/api/v1/admin/super-admins")
    assert resp.status_code == 403
