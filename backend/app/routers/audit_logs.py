from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, require_role
from app.models.audit import AuditLog
from app.models.user import Role, User
from app.response import envelope
from app.schemas.audit import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])

# For super_admin (school_id is None), this naturally scopes to platform-level entries —
# the same filter that scopes a school_admin to their own school's entries.
MAX_LIMIT = 200


@router.get("")
def list_audit_logs(
    limit: int = 50,
    offset: int = 0,
    action: str | None = None,
    entity_type: str | None = None,
    current_user: CurrentUser = Depends(require_role(Role.school_admin, Role.super_admin)),
    db: Session = Depends(get_db),
):
    limit = max(1, min(limit, MAX_LIMIT))
    offset = max(0, offset)

    query = db.query(AuditLog).filter(AuditLog.school_id == current_user.school_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    total = query.count()
    rows = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    actor_ids = {r.user_id for r in rows if r.user_id}
    actors = {u.id: u for u in db.query(User).filter(User.id.in_(actor_ids)).all()} if actor_ids else {}

    out = []
    for r in rows:
        actor = actors.get(r.user_id) if r.user_id else None
        out.append(AuditLogOut(
            id=r.id, action=r.action, entity_type=r.entity_type, entity_id=r.entity_id,
            old_value=r.old_value, new_value=r.new_value, created_at=r.created_at,
            actor_nom=actor.nom if actor else None, actor_email=actor.email if actor else None,
        ).model_dump(mode="json"))

    return envelope({"total": total, "items": out})
