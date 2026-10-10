from datetime import date

from app.models.school import School
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def setup_school_and_student(client, db_session):
    school = School(nom="Payments School", adresse="Kinshasa", telephone="+243", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()

    admin = User(
        school_id=school.id, nom="Admin", email="admin.pay@test.cd", password_hash=hash_password("password123"),
        telephone="", role=Role.school_admin, statut=UserStatus.actif,
    )
    db_session.add(admin)
    db_session.commit()

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin.pay@test.cd", "password": "password123", "school_id": school.id},
    )
    assert login_resp.status_code == 200

    student_resp = client.post(
        "/api/v1/students",
        json={"matricule": "P-1", "nom": "Payeur", "prenom": "Elle", "date_naissance": "2015-01-01"},
    )
    assert student_resp.status_code == 200
    return student_resp.json()["data"]["id"]


def test_payment_recompute_partial_then_full(client, db_session):
    student_id = setup_school_and_student(client, db_session)

    invoice_resp = client.post(
        "/api/v1/invoices",
        json={"student_id": student_id, "type_frais": "scolarite", "montant_total": 150000},
    )
    assert invoice_resp.status_code == 200
    invoice = invoice_resp.json()["data"]
    assert invoice["montant_paye"] == 0
    assert invoice["reste_a_payer"] == 150000
    assert invoice["statut"] == "impaye"

    pay1 = client.post(
        "/api/v1/payments",
        json={"invoice_id": invoice["id"], "montant": 100000, "mode_paiement": "especes"},
    )
    assert pay1.status_code == 200
    data1 = pay1.json()["data"]
    assert data1["payment"]["partiel"] is True
    assert data1["invoice"]["montant_paye"] == 100000
    assert data1["invoice"]["reste_a_payer"] == 50000
    assert data1["invoice"]["statut"] == "partiel"

    pay2 = client.post(
        "/api/v1/payments",
        json={"invoice_id": invoice["id"], "montant": 50000, "mode_paiement": "mobile_money"},
    )
    assert pay2.status_code == 200
    data2 = pay2.json()["data"]
    assert data2["payment"]["partiel"] is False
    assert data2["invoice"]["montant_paye"] == 150000
    assert data2["invoice"]["reste_a_payer"] == 0
    assert data2["invoice"]["statut"] == "paye"


def test_payment_exceeding_balance_rejected(client, db_session):
    student_id = setup_school_and_student(client, db_session)

    invoice_resp = client.post(
        "/api/v1/invoices",
        json={"student_id": student_id, "type_frais": "cantine", "montant_total": 45000},
    )
    invoice = invoice_resp.json()["data"]

    resp = client.post(
        "/api/v1/payments",
        json={"invoice_id": invoice["id"], "montant": 50000, "mode_paiement": "especes"},
    )
    assert resp.status_code == 400
    assert resp.json()["success"] is False
