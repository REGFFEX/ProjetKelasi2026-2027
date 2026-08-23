from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session, email="admin.audit@test.cd") -> School:
    school = School(nom="Audit School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
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


def test_school_admin_sees_own_school_audit_log(client, db_session):
    setup_school_admin(client, db_session)

    # Creating a user writes a CREATE_USER audit entry (see test_user_management.py).
    client.post("/api/v1/users", json={"nom": "Secrétaire", "email": "sec.audit@test.cd", "password": "password123", "role": "secretary"})

    resp = client.get("/api/v1/audit-logs")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["total"] >= 1
    entry = next(e for e in data["items"] if e["action"] == "CREATE_USER")
    assert entry["actor_email"] == "admin.audit@test.cd"


def test_audit_log_isolated_between_schools(client, db_session):
    school_a = setup_school_admin(client, db_session, email="admin.audit.a@test.cd")
    client.post("/api/v1/users", json={"nom": "X", "email": "x.audit@test.cd", "password": "password123", "role": "secretary"})
    client.post("/api/v1/auth/logout")

    school_b = School(nom="Audit School B", adresse="Pointe-Noire", telephone="+242", date_creation=date(2024, 1, 1))
    db_session.add(school_b)
    db_session.flush()
    admin_b = User(
        school_id=school_b.id, nom="Admin B", email="admin.audit.b@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin_b)
    db_session.commit()
    client.post("/api/v1/auth/login", json={"email": "admin.audit.b@test.cd", "password": "password123", "school_id": school_b.id})

    resp = client.get("/api/v1/audit-logs")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(e["action"] != "CREATE_USER" or "x.audit" not in (e.get("new_value") or "") for e in data["items"])


def test_non_admin_cannot_view_audit_log(client, db_session):
    school = setup_school_admin(client, db_session, email="admin.audit.c@test.cd")
    teacher = User(
        school_id=school.id, nom="Prof", email="prof.audit@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.teacher, statut=UserStatus.actif,
    )
    db_session.add(teacher)
    db_session.commit()
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "prof.audit@test.cd", "password": "password123", "school_id": school.id})

    resp = client.get("/api/v1/audit-logs")
    assert resp.status_code == 403
