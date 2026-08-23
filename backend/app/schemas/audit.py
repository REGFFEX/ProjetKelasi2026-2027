from datetime import datetime

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str
    old_value: str | None = None
    new_value: str | None = None
    created_at: datetime
    actor_nom: str | None = None
    actor_email: str | None = None
