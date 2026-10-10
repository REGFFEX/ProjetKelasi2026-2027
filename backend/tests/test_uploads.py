import io
from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password

TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000155bd8ea60000000049454e44ae426082"
)


def setup_school_admin(client, db_session, email="admin.upload@test.cd") -> School:
    school = School(nom="Upload School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
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


def test_upload_school_logo(client, db_session):
    setup_school_admin(client, db_session)

    resp = client.post(
        "/api/v1/schools/me/logo",
        files={"file": ("logo.png", io.BytesIO(TINY_PNG), "image/png")},
    )
    assert resp.status_code == 200
    logo_path = resp.json()["data"]["logo"]
    assert logo_path.startswith("uploads/logos/")

    served = client.get(f"/api/v1/{logo_path}")
    assert served.status_code == 200
    assert served.content == TINY_PNG


def test_upload_student_photo(client, db_session):
    setup_school_admin(client, db_session, email="admin.upload2@test.cd")
    student = client.post(
        "/api/v1/students",
        json={"matricule": "PH-1", "nom": "Test", "prenom": "Photo", "date_naissance": "2015-01-01"},
    ).json()["data"]

    resp = client.post(
        f"/api/v1/students/{student['id']}/photo",
        files={"file": ("photo.png", io.BytesIO(TINY_PNG), "image/png")},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["photo"].startswith("uploads/photos/")


def test_upload_rejects_non_image(client, db_session):
    setup_school_admin(client, db_session, email="admin.upload3@test.cd")
    resp = client.post(
        "/api/v1/schools/me/logo",
        files={"file": ("logo.txt", io.BytesIO(b"not an image"), "text/plain")},
    )
    assert resp.status_code == 400


def test_upload_requires_role(client, db_session):
    school = setup_school_admin(client, db_session, email="admin.upload4@test.cd")
    teacher = User(
        school_id=school.id, nom="Prof", email="prof.upload@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.teacher, statut=UserStatus.actif,
    )
    db_session.add(teacher)
    db_session.commit()
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "prof.upload@test.cd", "password": "password123", "school_id": school.id})

    resp = client.post(
        "/api/v1/schools/me/logo",
        files={"file": ("logo.png", io.BytesIO(TINY_PNG), "image/png")},
    )
    assert resp.status_code == 403


def test_api_responses_are_not_cacheable(client, db_session):
    setup_school_admin(client, db_session, email="admin.upload5@test.cd")
    resp = client.get("/api/v1/schools/me")
    assert resp.headers.get("cache-control") == "no-store"
