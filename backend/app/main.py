from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.response import register_exception_handlers
from app.routers import (
    auth,
    students,
    parents,
    classrooms,
    subjects,
    teachers,
    attendance,
    grades,
    invoices,
    payments,
    misc,
)

app = FastAPI(title="Kelasi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(students.router, prefix=API_PREFIX)
app.include_router(parents.router, prefix=API_PREFIX)
app.include_router(classrooms.router, prefix=API_PREFIX)
app.include_router(subjects.router, prefix=API_PREFIX)
app.include_router(teachers.router, prefix=API_PREFIX)
app.include_router(attendance.router, prefix=API_PREFIX)
app.include_router(grades.router, prefix=API_PREFIX)
app.include_router(invoices.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(misc.router, prefix=API_PREFIX)


@app.get("/health")
def health():
    return {"success": True, "message": "ok", "data": None}
