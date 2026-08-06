from datetime import date

from app.models.school import School


def make_school(db_session) -> School:
    school = School(nom="Test School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)
    return school


def test_signup_login_me_logout(client, db_session):
    school = make_school(db_session)

    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={
            "nom": "Admin Test",
            "email": "admin@test.cd",
            "password": "password123",
            "telephone": "+243000000",
            "role": "school_admin",
            "school_id": school.id,
        },
    )
    assert signup_resp.status_code == 200
    body = signup_resp.json()
    assert body["success"] is True
    assert body["data"]["email"] == "admin@test.cd"

    logout_resp = client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200

    me_after_logout = client.get("/api/v1/auth/me")
    assert me_after_logout.status_code == 401

    login_resp = client.post(
        "/api/v1/auth/login", json={"email": "admin@test.cd", "password": "password123"}
    )
    assert login_resp.status_code == 200

    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["role"] == "school_admin"


def test_login_wrong_password_fails(client, db_session):
    school = make_school(db_session)
    client.post(
        "/api/v1/auth/signup",
        json={
            "nom": "Admin Test",
            "email": "admin2@test.cd",
            "password": "password123",
            "role": "school_admin",
            "school_id": school.id,
        },
    )
    client.post("/api/v1/auth/logout")

    resp = client.post("/api/v1/auth/login", json={"email": "admin2@test.cd", "password": "wrong"})
    assert resp.status_code == 401
    assert resp.json()["success"] is False


def test_role_mismatch_returns_403(client, db_session):
    school = make_school(db_session)
    client.post(
        "/api/v1/auth/signup",
        json={
            "nom": "Teacher Test",
            "email": "teacher@test.cd",
            "password": "password123",
            "role": "teacher",
            "school_id": school.id,
        },
    )
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
