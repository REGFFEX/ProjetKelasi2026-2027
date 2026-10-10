from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def make_school_and_admin(client, db_session, email="admin@umtest.cd") -> School:
    school = School(nom="UM School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()
    admin = User(
        school_id=school.id, nom="Admin", email=email, password_hash=hash_password("password123"),
        telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin)
    db_session.commit()
    resp = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123", "school_id": school.id}
    )
    assert resp.status_code == 200
    return school


def test_school_admin_creates_and_manages_a_user(client, db_session):
    school = make_school_and_admin(client, db_session)

    created = client.post(
        "/api/v1/users",
        json={"nom": "Marie Secrétaire", "email": "marie@umtest.cd", "password": "password123", "role": "secretary"},
    )
    assert created.status_code == 200
    user_id = created.json()["data"]["id"]

    # the new account can log in, tenant-scoped
    client.post("/api/v1/auth/logout")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "marie@umtest.cd", "password": "password123", "school_id": school.id},
    )
    assert login.status_code == 200

    # back as admin: deactivate the account
    client.post("/api/v1/auth/logout")
    client.post(
        "/api/v1/auth/login",
        json={"email": "admin@umtest.cd", "password": "password123", "school_id": school.id},
    )
    deactivated = client.patch(f"/api/v1/users/{user_id}", json={"statut": "inactif"})
    assert deactivated.status_code == 200

    client.post("/api/v1/auth/logout")
    blocked_login = client.post(
        "/api/v1/auth/login",
        json={"email": "marie@umtest.cd", "password": "password123", "school_id": school.id},
    )
    assert blocked_login.status_code == 403


def test_duplicate_email_within_school_rejected(client, db_session):
    make_school_and_admin(client, db_session)
    client.post(
        "/api/v1/users",
        json={"nom": "A", "email": "dup@umtest.cd", "password": "password123", "role": "secretary"},
    )
    dup = client.post(
        "/api/v1/users",
        json={"nom": "B", "email": "dup@umtest.cd", "password": "password123", "role": "accountant"},
    )
    assert dup.status_code == 409


def test_creating_teacher_via_users_endpoint_links_teacher_profile(client, db_session):
    make_school_and_admin(client, db_session)
    created = client.post(
        "/api/v1/users",
        json={"nom": "Jean Prof", "email": "jeanprof@umtest.cd", "password": "password123", "role": "teacher"},
    )
    assert created.status_code == 200

    teachers = client.get("/api/v1/teachers").json()["data"]
    assert any(t["email"] == "jeanprof@umtest.cd" and t["user_id"] == created.json()["data"]["id"] for t in teachers)


def test_non_admin_cannot_create_users(client, db_session):
    school = make_school_and_admin(client, db_session)
    teacher = User(
        school_id=school.id, nom="Prof", email="prof2@umtest.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.teacher, statut=UserStatus.actif,
    )
    db_session.add(teacher)
    db_session.commit()

    client.post("/api/v1/auth/logout")
    client.post(
        "/api/v1/auth/login",
        json={"email": "prof2@umtest.cd", "password": "password123", "school_id": school.id},
    )
    resp = client.post(
        "/api/v1/users",
        json={"nom": "X", "email": "x@umtest.cd", "password": "password123", "role": "secretary"},
    )
    assert resp.status_code == 403


def test_teacher_created_with_password_can_log_in(client, db_session):
    make_school_and_admin(client, db_session)
    created = client.post(
        "/api/v1/teachers",
        json={"nom": "Kalonji", "prenom": "Paul", "email": "paul.kalonji@umtest.cd", "password": "password123"},
    )
    assert created.status_code == 200
    assert created.json()["data"]["user_id"] is not None

    school = db_session.query(School).filter(School.nom == "UM School").first()
    client.post("/api/v1/auth/logout")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "paul.kalonji@umtest.cd", "password": "password123", "school_id": school.id},
    )
    assert login.status_code == 200
