from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def make_school(db_session) -> School:
    school = School(nom="Test School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)
    return school


def make_user(db_session, school: School, role: str, email: str, nom: str = "Test User", password: str = "password123") -> User:
    user = User(
        school_id=school.id, nom=nom, email=email, password_hash=hash_password(password),
        telephone="", role=Role(role), statut=UserStatus.actif,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_signup_login_me_logout(client, db_session):
    school = make_school(db_session)
    make_user(db_session, school, "school_admin", "admin@test.cd", nom="Admin Test")

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.cd", "password": "password123", "school_id": school.id},
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["data"]["email"] == "admin@test.cd"

    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["role"] == "school_admin"

    logout_resp = client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200

    me_after_logout = client.get("/api/v1/auth/me")
    assert me_after_logout.status_code == 401


def test_login_wrong_password_fails(client, db_session):
    school = make_school(db_session)
    make_user(db_session, school, "school_admin", "admin2@test.cd")

    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin2@test.cd", "password": "wrong", "school_id": school.id},
    )
    assert resp.status_code == 401
    assert resp.json()["success"] is False


def test_login_wrong_tenant_fails(client, db_session):
    school_a = make_school(db_session)
    school_b = School(nom="Other School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school_b)
    db_session.commit()
    db_session.refresh(school_b)
    make_user(db_session, school_a, "school_admin", "admin3@test.cd")

    # Right email/password, but scoped to the wrong tenant.
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin3@test.cd", "password": "password123", "school_id": school_b.id},
    )
    assert resp.status_code == 401


def test_login_without_school_id_resolves_by_email(client, db_session):
    school = make_school(db_session)
    make_user(db_session, school, "school_admin", "admin4@test.cd")

    resp = client.post("/api/v1/auth/login", json={"email": "admin4@test.cd", "password": "password123"})
    assert resp.status_code == 200
    assert resp.json()["data"]["school_id"] == school.id


def test_login_with_email_shared_across_schools_requires_disambiguation(client, db_session):
    school_a = make_school(db_session)
    school_b = School(nom="Other School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school_b)
    db_session.commit()
    db_session.refresh(school_b)
    make_user(db_session, school_a, "school_admin", "shared@test.cd")
    make_user(db_session, school_b, "school_admin", "shared@test.cd")

    ambiguous = client.post("/api/v1/auth/login", json={"email": "shared@test.cd", "password": "password123"})
    assert ambiguous.status_code == 409

    disambiguated = client.post(
        "/api/v1/auth/login",
        json={"email": "shared@test.cd", "password": "password123", "school_id": school_a.id},
    )
    assert disambiguated.status_code == 200
    assert disambiguated.json()["data"]["school_id"] == school_a.id


def test_role_mismatch_returns_403(client, db_session):
    school = make_school(db_session)
    make_user(db_session, school, "teacher", "teacher@test.cd", nom="Teacher Test")

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "teacher@test.cd", "password": "password123", "school_id": school.id},
    )
    assert login_resp.status_code == 200

    # teachers are not in students.WRITE_ROLES (school_admin, secretary)
    resp = client.post(
        "/api/v1/students",
        json={
            "matricule": "M-1",
            "nom": "Eleve",
            "prenom": "Un",
            "date_naissance": "2015-01-01",
        },
    )
    assert resp.status_code == 403
