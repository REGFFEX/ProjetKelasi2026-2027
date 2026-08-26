from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.file_storage import UPLOADS_DIR, PUBLIC_PREFIX
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
    cycles,
    levels,
    academic_years,
    assignments,
    parent,
    schools_admin,
    users,
    super_admins,
    audit_logs,
    communication,
    reports,
)

app = FastAPI(title="Kelasi API")

API_PREFIX = "/api/v1"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_store_api_responses(request, call_next):
    """Every response carries the caller's current permissions (role, statut, school
    scope) baked in. A cached copy served after a role change or deactivation would look
    exactly like continued access, so nothing under /api is ever cacheable."""
    response = await call_next(request)
    if request.url.path.startswith(API_PREFIX):
        response.headers["Cache-Control"] = "no-store"
    return response


register_exception_handlers(app)

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount(f"{API_PREFIX}/{PUBLIC_PREFIX}", StaticFiles(directory=UPLOADS_DIR), name="uploads")

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
app.include_router(cycles.router, prefix=API_PREFIX)
app.include_router(levels.router, prefix=API_PREFIX)
app.include_router(academic_years.router, prefix=API_PREFIX)
app.include_router(assignments.router, prefix=API_PREFIX)
app.include_router(parent.router, prefix=API_PREFIX)
app.include_router(schools_admin.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(super_admins.router, prefix=API_PREFIX)
app.include_router(audit_logs.router, prefix=API_PREFIX)
app.include_router(communication.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)


@app.get("/health")
def health():
    return {"success": True, "message": "ok", "data": None}
