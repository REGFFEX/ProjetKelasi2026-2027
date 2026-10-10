from datetime import date, datetime, timedelta

from app.models.desktop_sync import DesktopLinkCode
from app.models.school import School, SubscriptionStatus
from app.models.user import Role, User, UserStatus
from app.security import hash_password


def make_school_admin(client, db_session, nom="École Sync", email="admin@sync.cg") -> School:
    school = School(nom=nom, adresse="Brazzaville", telephone="+242", date_creation=date(2024, 1, 1))
    db_session.add(school)
    db_session.flush()
    db_session.add(
        User(
            school_id=school.id, nom="Admin", email=email, password_hash=hash_password("password123"),
            telephone="", role=Role.school_admin, statut=UserStatus.actif,
        )
    )
    db_session.commit()
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123", "school_id": school.id})
    assert resp.status_code == 200
    return school


def link(client, code, nom="Secrétariat"):
    return client.post("/api/v1/desktop-sync/link", json={"code": code, "nom_poste": nom})


def new_code(client) -> str:
    resp = client.post("/api/v1/desktop-sync/codes")
    assert resp.status_code == 200
    return resp.json()["data"]["code"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def record(uuid, modified_at, data=None, deleted=False, table="eleves"):
    return {"table": table, "uuid": uuid, "data": data, "deleted": deleted, "modified_at": modified_at}


def test_link_code_lets_several_computers_join(client, db_session):
    school = make_school_admin(client, db_session)
    code = new_code(client)
    assert code.startswith("KLS-")

    first = link(client, code.lower().replace("-", "- "), "Secrétariat").json()["data"]
    second = link(client, code, "Comptabilité").json()["data"]
    assert first["school"] == {"id": school.id, "nom": "École Sync"}
    assert [first["code_poste"], second["code_poste"]] == ["P1", "P2"]
    assert first["token"] != second["token"]

    devices = client.get("/api/v1/desktop-sync/devices").json()["data"]
    assert [d["nom"] for d in devices] == ["Secrétariat", "Comptabilité"]


def test_invalid_or_expired_code_is_refused(client, db_session):
    make_school_admin(client, db_session)
    assert link(client, "KLS-AAAA-BBBB-CCCC").status_code == 401
    code = new_code(client)
    db_session.query(DesktopLinkCode).update({"expires_at": datetime.now() - timedelta(days=1)})
    db_session.commit()
    assert link(client, code).status_code == 401


def test_only_school_admin_manages_codes(client, db_session):
    school = make_school_admin(client, db_session)
    db_session.add(
        User(
            school_id=school.id, nom="Compta", email="compta@sync.cg", password_hash=hash_password("password123"),
            telephone="", role=Role.accountant, statut=UserStatus.actif,
        )
    )
    db_session.commit()
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "compta@sync.cg", "password": "password123", "school_id": school.id})
    assert client.post("/api/v1/desktop-sync/codes").status_code == 403


def test_push_then_pull_between_computers_last_writer_wins(client, db_session):
    make_school_admin(client, db_session)
    code = new_code(client)
    a = link(client, code, "A").json()["data"]["token"]
    b = link(client, code, "B").json()["data"]["token"]

    pushed = client.post(
        "/api/v1/desktop-sync/push",
        json={"records": [record("e1", 100, {"nom": "MBEMBA"}), record("e2", 100, {"nom": "OKEMBA"})]},
        headers=auth(a),
    ).json()["data"]
    assert pushed == {"accepted": 2, "ignored": 0}

    # B sees A's rows; A does not get its own rows back but its cursor moves.
    pull_b = client.get("/api/v1/desktop-sync/pull?since=0", headers=auth(b)).json()["data"]
    assert [r["uuid"] for r in pull_b["records"]] == ["e1", "e2"]
    pull_a = client.get("/api/v1/desktop-sync/pull?since=0", headers=auth(a)).json()["data"]
    assert pull_a["records"] == [] and pull_a["next"] == pull_b["next"]

    # B edits e1 later; an older edit from A is ignored.
    client.post("/api/v1/desktop-sync/push", json={"records": [record("e1", 200, {"nom": "MBEMBA G."})]}, headers=auth(b))
    stale = client.post(
        "/api/v1/desktop-sync/push", json={"records": [record("e1", 150, {"nom": "ancien"})]}, headers=auth(a)
    ).json()["data"]
    assert stale == {"accepted": 0, "ignored": 1}

    since = pull_a["next"]
    changes = client.get(f"/api/v1/desktop-sync/pull?since={since}", headers=auth(a)).json()["data"]
    assert [(r["uuid"], r["data"]) for r in changes["records"]] == [("e1", {"nom": "MBEMBA G."})]

    # Deletions travel as tombstones.
    client.post("/api/v1/desktop-sync/push", json={"records": [record("e2", 300, deleted=True)]}, headers=auth(b))
    gone = client.get(f"/api/v1/desktop-sync/pull?since={changes['next']}", headers=auth(a)).json()["data"]
    assert [(r["uuid"], r["deleted"], r["data"]) for r in gone["records"]] == [("e2", True, None)]


def test_pull_is_paginated(client, db_session):
    make_school_admin(client, db_session)
    code = new_code(client)
    a = link(client, code, "A").json()["data"]["token"]
    b = link(client, code, "B").json()["data"]["token"]
    client.post(
        "/api/v1/desktop-sync/push",
        json={"records": [record(f"e{i}", 1, {"i": i}) for i in range(5)]},
        headers=auth(a),
    )
    page = client.get("/api/v1/desktop-sync/pull?since=0&limit=3", headers=auth(b)).json()["data"]
    assert len(page["records"]) == 3 and page["more"] is True
    rest = client.get(f"/api/v1/desktop-sync/pull?since={page['next']}&limit=3", headers=auth(b)).json()["data"]
    assert len(rest["records"]) == 2 and rest["more"] is False


def test_schools_are_isolated_and_revocation_blocks(client, db_session):
    make_school_admin(client, db_session)
    token_1 = link(client, new_code(client), "A").json()["data"]["token"]
    client.post("/api/v1/desktop-sync/push", json={"records": [record("secret", 1, {"x": 1})]}, headers=auth(token_1))

    client.post("/api/v1/auth/logout")
    make_school_admin(client, db_session, nom="Autre école", email="admin@autre.cg")
    token_2 = link(client, new_code(client), "B").json()["data"]["token"]
    assert client.get("/api/v1/desktop-sync/pull?since=0", headers=auth(token_2)).json()["data"]["records"] == []

    device_id = client.get("/api/v1/desktop-sync/devices").json()["data"][0]["id"]
    assert client.delete(f"/api/v1/desktop-sync/devices/{device_id}").status_code == 200
    assert client.get("/api/v1/desktop-sync/pull?since=0", headers=auth(token_2)).status_code == 401
    assert client.get("/api/v1/desktop-sync/pull?since=0").status_code == 401


def test_expired_subscription_blocks_sync(client, db_session):
    school = make_school_admin(client, db_session)
    token = link(client, new_code(client), "A").json()["data"]["token"]
    school.statut_abonnement = SubscriptionStatus.expire
    db_session.commit()
    assert client.get("/api/v1/desktop-sync/pull?since=0", headers=auth(token)).status_code == 403
