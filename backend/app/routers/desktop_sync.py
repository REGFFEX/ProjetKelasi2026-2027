"""Sync space for the Kelasi desktop application.

Each school's desktop computers share their local SQLite data through here: they
push changed rows and pull the rows other computers changed. Records are opaque
JSON owned by the desktop schema; this module only stores the latest version of
each row and orders changes with a per-write sequence number."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.authz import write_audit_log
from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.desktop_sync import DesktopDevice, DesktopLinkCode, DesktopSyncRecord
from app.models.school import School, SubscriptionStatus
from app.models.user import Role
from app.response import APIException, envelope

router = APIRouter(prefix="/desktop-sync", tags=["desktop-sync"])

LINK_CODE_VALIDITY = timedelta(days=7)
MAX_PUSH = 1000
MAX_PULL = 1000


def _hash(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _new_link_code() -> str:
    # 12 characters without look-alikes (0/O, 1/I/L), grouped for dictation.
    alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
    raw = "".join(secrets.choice(alphabet) for _ in range(12))
    return f"KLS-{raw[0:4]}-{raw[4:8]}-{raw[8:12]}"


def _normalize_code(code: str) -> str:
    return code.strip().upper().replace(" ", "")


# --- Administration (school admin, web session) -------------------------------

admin_only = require_role(Role.school_admin)


@router.post("/codes")
def create_link_code(current_user: CurrentUser = Depends(admin_only), db: Session = Depends(get_db)):
    code = _new_link_code()
    expires_at = _now() + LINK_CODE_VALIDITY
    db.add(
        DesktopLinkCode(
            school_id=current_user.school_id,
            code_hash=_hash(code),
            expires_at=expires_at,
            created_by=current_user.id,
        )
    )
    write_audit_log(db, current_user, "create", "desktop_link_code", "", None, {"expires_at": expires_at.isoformat()})
    db.commit()
    return envelope({"code": code, "expires_at": expires_at.isoformat()}, "Code de liaison créé")


@router.get("/devices")
def list_devices(current_user: CurrentUser = Depends(admin_only), db: Session = Depends(get_db)):
    devices = (
        db.query(DesktopDevice)
        .filter(DesktopDevice.school_id == current_user.school_id)
        # P2 before P10, then creation time for equal labels.
        .order_by(func.length(DesktopDevice.code_poste), DesktopDevice.code_poste)
        .all()
    )
    return envelope(
        [
            {
                "id": d.id,
                "nom": d.nom,
                "code_poste": d.code_poste,
                "created_at": d.created_at.isoformat(),
                "last_seen_at": d.last_seen_at.isoformat() if d.last_seen_at else None,
                "revoked": d.revoked,
            }
            for d in devices
        ]
    )


@router.delete("/devices/{device_id}")
def revoke_device(device_id: str, current_user: CurrentUser = Depends(admin_only), db: Session = Depends(get_db)):
    device = db.get(DesktopDevice, device_id)
    if not device or device.school_id != current_user.school_id:
        raise APIException(404, "Poste introuvable.")
    device.revoked = True
    write_audit_log(db, current_user, "revoke", "desktop_device", device.id, None, {"nom": device.nom})
    db.commit()
    return envelope(None, "Poste révoqué")


# --- Desktop endpoints (device token) ------------------------------------------


class LinkRequest(BaseModel):
    code: str
    nom_poste: str = Field(min_length=1, max_length=255)


def _check_school_active(school: School | None) -> School:
    if not school:
        raise APIException(404, "École introuvable.")
    if school.statut_abonnement == SubscriptionStatus.expire:
        raise APIException(403, "L'abonnement de l'école a expiré.")
    return school


@router.post("/link")
def link_device(body: LinkRequest, db: Session = Depends(get_db)):
    link = (
        db.query(DesktopLinkCode)
        .filter(DesktopLinkCode.code_hash == _hash(_normalize_code(body.code)))
        .first()
    )
    if not link or link.revoked or link.expires_at < _now():
        raise APIException(401, "Code de liaison invalide ou expiré.")
    school = _check_school_active(db.get(School, link.school_id))

    count = db.query(func.count(DesktopDevice.id)).filter(DesktopDevice.school_id == school.id).scalar() or 0
    token = secrets.token_urlsafe(32)
    device = DesktopDevice(
        school_id=school.id,
        nom=body.nom_poste.strip(),
        code_poste=f"P{count + 1}",
        token_hash=_hash(token),
        last_seen_at=_now(),
    )
    db.add(device)
    db.commit()
    return envelope(
        {
            "token": token,
            "device_id": device.id,
            "code_poste": device.code_poste,
            "school": {"id": school.id, "nom": school.nom},
        },
        "Poste lié",
    )


def current_device(request: Request, db: Session = Depends(get_db)) -> DesktopDevice:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise APIException(401, "Poste non authentifié.")
    device = db.query(DesktopDevice).filter(DesktopDevice.token_hash == _hash(header[7:].strip())).first()
    if not device or device.revoked:
        raise APIException(401, "Ce poste n'est plus autorisé à synchroniser.")
    _check_school_active(db.get(School, device.school_id))
    device.last_seen_at = _now()
    return device


class SyncRecordIn(BaseModel):
    table: str = Field(min_length=1, max_length=64)
    uuid: str = Field(min_length=1, max_length=255)
    data: dict | None = None
    deleted: bool = False
    modified_at: int


class PushRequest(BaseModel):
    records: list[SyncRecordIn] = Field(max_length=MAX_PUSH)


@router.post("/push")
def push(body: PushRequest, device: DesktopDevice = Depends(current_device), db: Session = Depends(get_db)):
    accepted = ignored = 0
    for rec in body.records:
        existing = (
            db.query(DesktopSyncRecord)
            .filter(
                DesktopSyncRecord.school_id == device.school_id,
                DesktopSyncRecord.table_name == rec.table,
                DesktopSyncRecord.record_uuid == rec.uuid,
            )
            .first()
        )
        if existing and existing.modified_at >= rec.modified_at:
            ignored += 1
            continue
        if existing:
            # A new row (instead of an UPDATE) gives the change a new seq.
            db.delete(existing)
            db.flush()
        db.add(
            DesktopSyncRecord(
                school_id=device.school_id,
                table_name=rec.table,
                record_uuid=rec.uuid,
                data=None if rec.deleted else rec.data,
                deleted=rec.deleted,
                modified_at=rec.modified_at,
                device_id=device.id,
            )
        )
        accepted += 1
    db.commit()
    return envelope({"accepted": accepted, "ignored": ignored})


@router.get("/pull")
def pull(
    since: int = 0,
    limit: int = MAX_PULL,
    device: DesktopDevice = Depends(current_device),
    db: Session = Depends(get_db),
):
    limit = max(1, min(limit, MAX_PULL))
    rows = (
        db.query(DesktopSyncRecord)
        .filter(DesktopSyncRecord.school_id == device.school_id, DesktopSyncRecord.seq > since)
        .order_by(DesktopSyncRecord.seq)
        .limit(limit + 1)
        .all()
    )
    more = len(rows) > limit
    rows = rows[:limit]
    db.commit()  # persists last_seen_at
    return envelope(
        {
            # Rows this computer pushed itself are skipped; the cursor still moves past them.
            "records": [
                {
                    "table": r.table_name,
                    "uuid": r.record_uuid,
                    "data": r.data,
                    "deleted": r.deleted,
                    "modified_at": r.modified_at,
                }
                for r in rows
                if r.device_id != device.id
            ],
            "next": rows[-1].seq if rows else since,
            "more": more,
        }
    )
