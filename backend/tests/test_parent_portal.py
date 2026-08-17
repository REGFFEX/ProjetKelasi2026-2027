from datetime import date

from app.models.people import Parent, Student, StudentParent
from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def _setup(db_session):
    school = School(nom="Parent School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()

    parent_user = User(
        school_id=school.id, nom="Jean Parent", email="jean.parent@test.cd",
        password_hash=hash_password("password123"), telephone="", role=Role.parent, statut=UserStatus.actif,
    )
    db_session.add(parent_user)
    db_session.flush()

    parent = Parent(school_id=school.id, user_id=parent_user.id, nom="Jean Parent", telephone="", adresse="", profession="")
    other_parent = Parent(school_id=school.id, nom="Autre Parent", telephone="", adresse="", profession="")
    db_session.add_all([parent, other_parent])
    db_session.flush()

    own_child = Student(
        school_id=school.id, matricule="C-1", nom="Enfant", prenom="Moi",
        date_naissance=date(2015, 1, 1), statut=UserStatus.actif,
    )
    other_child = Student(
        school_id=school.id, matricule="C-2", nom="Enfant", prenom="Autre",
        date_naissance=date(2015, 1, 1), statut=UserStatus.actif,
    )
    db_session.add_all([own_child, other_child])
    db_session.flush()

    db_session.add(StudentParent(school_id=school.id, student_id=own_child.id, parent_id=parent.id))
    db_session.add(StudentParent(school_id=school.id, student_id=other_child.id, parent_id=other_parent.id))
    db_session.commit()

    return {"school": school, "own_child": own_child, "other_child": other_child}


def test_parent_sees_only_own_children(client, db_session):
    ctx = _setup(db_session)
    login = client.post("/api/v1/auth/login", json={"email": "jean.parent@test.cd", "password": "password123", "school_id": ctx["school"].id})
    assert login.status_code == 200

    children = client.get("/api/v1/parent/children")
    assert children.status_code == 200
    ids = [c["id"] for c in children.json()["data"]]
    assert ids == [ctx["own_child"].id]


def test_parent_cannot_access_another_parents_child(client, db_session):
    ctx = _setup(db_session)
    client.post("/api/v1/auth/login", json={"email": "jean.parent@test.cd", "password": "password123", "school_id": ctx["school"].id})

    for path in ("grades", "attendance", "invoices", "payments"):
        resp = client.get(f"/api/v1/parent/children/{ctx['other_child'].id}/{path}")
        assert resp.status_code == 404, f"{path} should 404 for another parent's child"

    own = client.get(f"/api/v1/parent/children/{ctx['own_child'].id}/grades")
    assert own.status_code == 200


def test_parent_blocked_from_raw_students_endpoint(client, db_session):
    ctx = _setup(db_session)
    client.post("/api/v1/auth/login", json={"email": "jean.parent@test.cd", "password": "password123", "school_id": ctx["school"].id})
    resp = client.get("/api/v1/students")
    assert resp.status_code == 403
