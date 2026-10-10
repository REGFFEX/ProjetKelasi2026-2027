from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.authz import write_audit_log
from app.db import get_db
from app.deps import CurrentUser, get_current_user, require_role
from app.models.communication import Announcement
from app.models.user import Role, User
from app.response import envelope, APIException
from app.schemas.communication import AnnouncementCreate, AnnouncementOut

router = APIRouter(prefix="/announcements", tags=["communication"])

WRITE_ROLES = (Role.school_admin, Role.secretary)


def _serialize(db: Session, row: Announcement) -> dict:
    author = db.get(User, row.author_user_id) if row.author_user_id else None
    out = AnnouncementOut(
        id=row.id, school_id=row.school_id, auteur_id=row.author_user_id,
        auteur_nom=author.nom if author else "École",
        cible=row.cible, titre=row.titre, contenu=row.contenu, date_publication=row.created_at,
    )
    return out.model_dump(mode="json")


@router.get("")
def list_announcements(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Announcement)
        .filter(Announcement.school_id == current_user.school_id)
        .order_by(Announcement.created_at.desc())
        .all()
    )
    return envelope([_serialize(db, r) for r in rows])


@router.post("")
def create_announcement(
    body: AnnouncementCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = Announcement(
        school_id=current_user.school_id, author_user_id=current_user.id,
        cible=body.cible, titre=body.titre, contenu=body.contenu,
    )
    db.add(row)
    db.flush()
    write_audit_log(db, current_user, "CREATE_ANNOUNCEMENT", "announcement", row.id, new_value={"titre": row.titre})
    db.commit()
    db.refresh(row)
    return envelope(_serialize(db, row), "Annonce publiée.")


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = db.get(Announcement, announcement_id)
    if not row or row.school_id != current_user.school_id:
        raise APIException(404, "Annonce introuvable.")
    db.delete(row)
    db.commit()
    return envelope(None, "Annonce supprimée.")
