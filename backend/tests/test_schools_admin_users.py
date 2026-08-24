from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def make_super_admin_and_login(client, db_session, email="root2@platform.cd") -> User:
    u = User(
        school_id=None, nom="Root Admin", email=email,
        password_hash=hash_password("password123"), telephone="", role=Role.super_admin, statut=UserStatus.actif,
    )
    db_session.add(u)
    db_session.commit()
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert resp.status_code == 200
    return u


def make_school_with_admin_and_staff(db_session) -> School:
    school = School(nom="Overseen School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()
    admin = User(
        school_id=school.id, nom="Local Admin", email="local.admin@test.cd",
        password_hash=hash_password("password123"), telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    secretary = User(
        school_id=school.id, nom="Secrétaire Locale", email="local.sec@test.cd",
        password_hash=hash_password("password123"), telephone="", role=Role.secretary, statut=UserStatus.actif,
    )
    db_session.add_all([admin, secretary])
    db_session.commit()
    db_session.refresh(admin)
    db_session.refresh(secretary)
    return school, admin, secretary


def test_super_admin_can_view_all_roles_but_only_manage_the_school_admin(client, db_session):
    make_super_admin_and_login(client, db_session)
    school, admin, secretary = make_school_with_admin_and_staff(db_session)

    listed = client.get(f"/api/v1/admin/schools/{school.id}/users")
    assert listed.status_code == 200
    emails = {u["email"] for u in listed.json()["data"]}
    assert {"local.admin@test.cd", "local.sec@test.cd"}.issubset(emails)

    updated = client.patch(f"/api/v1/admin/schools/{school.id}/admins/{admin.id}", json={"nom": "Renamed Admin"})
    assert updated.status_code == 200
    assert updated.json()["data"]["nom"] == "Renamed Admin"

    reset = client.post(f"/api/v1/admin/schools/{school.id}/admins/{admin.id}/reset-password", json={"new_password": "newpassword123"})
    assert reset.status_code == 200

    blocked = client.patch(f"/api/v1/admin/schools/{school.id}/admins/{secretary.id}", json={"nom": "Nope"})
    assert blocked.status_code == 404


def test_cannot_deactivate_last_active_school_admin(client, db_session):
    make_super_admin_and_login(client, db_session, email="root3@platform.cd")
    school, admin, _ = make_school_with_admin_and_staff(db_session)

    resp = client.patch(f"/api/v1/admin/schools/{school.id}/admins/{admin.id}", json={"statut": "inactif"})
    assert resp.status_code == 400


def test_school_admin_cannot_use_platform_admin_endpoints(client, db_session):
    school, admin, _ = make_school_with_admin_and_staff(db_session)
    login = client.post("/api/v1/auth/login", json={"email": "local.admin@test.cd", "password": "password123", "school_id": school.id})
    assert login.status_code == 200

    resp = client.get(f"/api/v1/admin/schools/{school.id}/users")
    assert resp.status_code == 403
