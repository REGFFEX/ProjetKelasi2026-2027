from datetime import date

from pydantic import BaseModel

from app.models.operations import AttendanceStatus


class AttendanceRecord(BaseModel):
    student_id: str
    classroom_id: str | None = None
    date: date
    statut: AttendanceStatus


class AttendanceUpsert(BaseModel):
    records: list[AttendanceRecord]


class AttendanceOut(BaseModel):
    id: str
    school_id: str
    student_id: str
    classroom_id: str | None = None
    date: date
    statut: AttendanceStatus

    model_config = {"from_attributes": True}
