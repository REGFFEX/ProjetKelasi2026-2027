from datetime import date

from app.models.school import School


def make_school(db_session, nom: str) -> School:
    school = School(nom=nom, adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)
    return school


def signup(client, school_id: str, email: str) -> None:
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "nom": "Admin",
            "email": email,
            "password": "password123",
            "role": "school_admin",
            "school_id": school_id,
        },
    )
    assert resp.status_code == 200


def test_school_isolation_on_students(client, db_session):
    school_a = make_school(db_session, "School A")
    school_b = make_school(db_session, "School B")

    signup(client, school_a.id, "admin.a@test.cd")
    create_resp = client.post(
        "/api/v1/students",
        json={"matricule": "A-1", "nom": "Eleve", "prenom": "A", "date_naissance": "2015-01-01"},
    )
    assert create_resp.status_code == 200
    student_id = create_resp.json()["data"]["id"]
    client.post("/api/v1/auth/logout")

    signup(client, school_b.id, "admin.b@test.cd")
    get_resp = client.get(f"/api/v1/students/{student_id}")
    assert get_resp.status_code == 404

    list_resp = client.get("/api/v1/students")
    assert list_resp.status_code == 200
    assert list_resp.json()["data"] == []

    delete_resp = client.delete(f"/api/v1/students/{student_id}")
    assert delete_resp.status_code == 404
