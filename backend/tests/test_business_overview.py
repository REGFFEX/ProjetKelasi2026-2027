from datetime import date

from app.models.academic import AcademicYear, AcademicYearStatus, Cycle, EvaluationMode, Level
from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session, email="admin.bo@test.cd"):
    school = School(nom="BO School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
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


def make_level(db_session, school: School) -> str:
    cycle = Cycle(school_id=school.id, nom="Primaire", ordre=0, evaluation_mode=EvaluationMode.notes)
    db_session.add(cycle)
    db_session.flush()
    level = Level(school_id=school.id, cycle_id=cycle.id, nom="CE1", ordre=0)
    db_session.add(level)
    db_session.commit()
    db_session.refresh(level)
    return level.id


def test_business_overview_with_no_data_is_graceful(client, db_session):
    setup_school_admin(client, db_session)
    resp = client.get("/api/v1/reports/business-overview")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["academic_year_label"] is None
    assert data["enrollment"]["current_total"] == 0
    assert data["revenue"]["total_invoiced"] == 0
    assert "Aucune année scolaire active" in data["alerts"][0]


def test_business_overview_computes_growth_and_revenue(client, db_session):
    school = setup_school_admin(client, db_session, email="admin2.bo@test.cd")
    level_id = make_level(db_session, school)

    classroom = client.post(
        "/api/v1/classrooms", json={"level_id": level_id, "nom": "CE1 A", "salle": "S1"}
    ).json()["data"]

    # Previous (archived) year: 2 students enrolled
    prev_year = AcademicYear(
        school_id=school.id, libelle="2025-2026", date_debut=date(2025, 9, 1), date_fin=date(2026, 7, 15),
        statut=AcademicYearStatus.archivee,
    )
    db_session.add(prev_year)
    db_session.commit()

    from app.models.people import Enrollment, EnrollmentStatus, Student

    kept_student = Student(school_id=school.id, matricule="K-1", nom="Reste", prenom="Un", date_naissance=date(2015, 1, 1))
    left_student = Student(school_id=school.id, matricule="L-1", nom="Parti", prenom="Un", date_naissance=date(2015, 1, 1))
    db_session.add_all([kept_student, left_student])
    db_session.flush()
    db_session.add_all([
        Enrollment(school_id=school.id, student_id=kept_student.id, classroom_id=classroom["id"], academic_year_id=prev_year.id, statut=EnrollmentStatus.active),
        Enrollment(school_id=school.id, student_id=left_student.id, classroom_id=classroom["id"], academic_year_id=prev_year.id, statut=EnrollmentStatus.active),
    ])
    db_session.commit()

    # Current (active) year: only kept_student re-enrolled, plus a brand new student
    current_year_resp = client.post(
        "/api/v1/academic-years",
        json={"libelle": "2026-2027", "date_debut": "2026-09-01", "date_fin": "2027-07-15", "activate": True},
    )
    assert current_year_resp.status_code == 200
    current_year_id = current_year_resp.json()["data"]["id"]

    new_student = Student(school_id=school.id, matricule="N-1", nom="Nouveau", prenom="Un", date_naissance=date(2015, 1, 1))
    db_session.add(new_student)
    db_session.flush()
    db_session.add_all([
        Enrollment(school_id=school.id, student_id=kept_student.id, classroom_id=classroom["id"], academic_year_id=current_year_id, statut=EnrollmentStatus.active),
        Enrollment(school_id=school.id, student_id=new_student.id, classroom_id=classroom["id"], academic_year_id=current_year_id, statut=EnrollmentStatus.active),
    ])
    db_session.commit()

    # An invoice fully paid this year for revenue/collection-rate math
    invoice_resp = client.post(
        "/api/v1/invoices",
        json={"student_id": kept_student.id, "type_frais": "scolarite", "montant_total": 100000},
    )
    assert invoice_resp.status_code == 200
    invoice = invoice_resp.json()["data"]
    pay_resp = client.post(
        "/api/v1/payments", json={"invoice_id": invoice["id"], "montant": 100000, "mode_paiement": "especes"}
    )
    assert pay_resp.status_code == 200

    resp = client.get("/api/v1/reports/business-overview")
    assert resp.status_code == 200
    data = resp.json()["data"]

    assert data["academic_year_label"] == "2026-2027"
    assert data["enrollment"]["current_total"] == 2
    assert data["enrollment"]["previous_total"] == 2
    assert data["enrollment"]["growth_pct"] == 0.0
    assert data["enrollment"]["attrition_pct"] == 50.0
    assert data["enrollment"]["new_enrollments"] == 1
    assert data["enrollment"]["has_previous_year"] is True

    assert data["revenue"]["total_invoiced"] == 100000
    assert data["revenue"]["total_collected"] == 100000
    assert data["revenue"]["collection_rate_pct"] == 100.0
    assert data["revenue"]["revenue_per_student"] == 50000.0

    assert any("50.0%" in a and "réinscrits" in a for a in data["alerts"])


def test_business_overview_requires_school_admin(client, db_session):
    school = setup_school_admin(client, db_session, email="admin3.bo@test.cd")
    secretary = User(
        school_id=school.id, nom="Secr", email="secretary.bo@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.secretary, statut=UserStatus.actif,
    )
    db_session.add(secretary)
    db_session.commit()
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "secretary.bo@test.cd", "password": "password123", "school_id": school.id})

    resp = client.get("/api/v1/reports/business-overview")
    assert resp.status_code == 403
