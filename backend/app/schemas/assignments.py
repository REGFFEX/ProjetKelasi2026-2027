from pydantic import BaseModel


class TeacherAssignmentCreate(BaseModel):
    teacher_id: str
    subject_id: str
    classroom_id: str
    academic_year_id: str | None = None  # defaults to the active year


class TeacherAssignmentOut(BaseModel):
    id: str
    school_id: str
    teacher_id: str
    subject_id: str
    classroom_id: str
    academic_year_id: str

    model_config = {"from_attributes": True}
