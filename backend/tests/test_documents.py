from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_admin(client, db_session, email="admin.docs@test.cd") -> School:
    school = School(nom="Docs School", adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
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


def make_student(client) -> dict:
    return client.post(
        "/api/v1/students",
        json={"matricule": "DOC-1", "nom": "Test", "prenom": "Élève", "date_naissance": "2015-01-01"},
    ).json()["data"]


def test_student_certificate_and_id_card_pdf(client, db_session):
    setup_school_admin(client, db_session)
    student = make_student(client)

    cert = client.get(f"/api/v1/students/{student['id']}/certificate.pdf")
    assert cert.status_code == 200
    assert cert.headers["content-type"] == "application/pdf"
    assert cert.content[:4] == b"%PDF"

    card = client.get(f"/api/v1/students/{student['id']}/id-card.pdf")
    assert card.status_code == 200
    assert card.content[:4] == b"%PDF"


def test_payment_receipt_pdf(client, db_session):
    setup_school_admin(client, db_session, email="admin.docs2@test.cd")
    student = make_student(client)

    invoice = client.post(
        "/api/v1/invoices",
        json={"student_id": student["id"], "type_frais": "scolarite", "montant_total": 100000},
    ).json()["data"]
    payment = client.post(
        "/api/v1/payments",
        json={"invoice_id": invoice["id"], "montant": 40000, "mode_paiement": "especes"},
    ).json()["data"]["payment"]

    receipt = client.get(f"/api/v1/payments/{payment['id']}/receipt.pdf")
    assert receipt.status_code == 200
    assert receipt.content[:4] == b"%PDF"


def test_reports_export_pdf(client, db_session):
    setup_school_admin(client, db_session, email="admin.docs3@test.cd")

    for report_type in ("financial", "attendance", "grades"):
        resp = client.get(f"/api/v1/reports/export.pdf?type={report_type}")
        assert resp.status_code == 200, report_type
        assert resp.content[:4] == b"%PDF"

    invalid = client.get("/api/v1/reports/export.pdf?type=bogus")
    assert invalid.status_code == 400


def test_reports_export_forbidden_for_secretary(client, db_session):
    school = setup_school_admin(client, db_session, email="admin.docs4@test.cd")
    secretary = User(
        school_id=school.id, nom="Secrétaire", email="sec.docs@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.secretary, statut=UserStatus.actif,
    )
    db_session.add(secretary)
    db_session.commit()
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "sec.docs@test.cd", "password": "password123", "school_id": school.id})

    resp = client.get("/api/v1/reports/export.pdf?type=financial")
    assert resp.status_code == 403
