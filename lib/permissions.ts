import { Role } from './types';

/**
 * Mirrors each backend router's WRITE_ROLES tuple, so the frontend can hide
 * create/edit/delete controls a role can't actually use instead of showing
 * them and letting the request 403. Keep in sync with the source of truth:
 * the WRITE_ROLES constant at the top of each backend/app/routers/*.py file.
 *
 * Deliberate exception — classrooms/subjects/teachers/assignments/cycles/
 * levels/academic_years/timetable: the backend accepts writes from both
 * school_admin and secretary (kept for schools without a staffed secretary
 * account, and as a safety net), but school_admin is intentionally left out
 * here. The director's day-to-day operational data entry (creating a
 * teacher, building the timetable, editing the class/subject/cycle
 * structure) moved to secretary, so their own screens no longer surface
 * those controls — the director's role is meant to stay strategic
 * oversight, not daily upkeep.
 */
const WRITE_ROLES = {
  classrooms: ['secretary'],
  subjects: ['secretary'],
  teachers: ['secretary'],
  students: ['school_admin', 'secretary'],
  parents: ['school_admin', 'secretary'],
  payments: ['school_admin', 'accountant'],
  invoices: ['school_admin', 'accountant'],
  cycles: ['secretary'],
  levels: ['secretary'],
  academic_years: ['secretary'],
  attendance: ['school_admin', 'secretary', 'teacher'],
  grades: ['school_admin', 'secretary', 'teacher'],
  communication: ['school_admin', 'secretary'],
  assignments: ['secretary'],
  timetable: ['secretary'],
  hourly_rates: ['school_admin', 'secretary'],
  evaluation_types: ['secretary'],
} as const satisfies Record<string, readonly Role[]>;

export type WritableResource = keyof typeof WRITE_ROLES;

export function canWrite(role: Role | undefined, resource: WritableResource): boolean {
  if (!role) return false;
  return (WRITE_ROLES[resource] as readonly Role[]).includes(role);
}

/**
 * Mirrors READ_ROLES in backend/app/routers/{invoices,payments}.py. Teachers and
 * parents can view a student's profile but have no read access to billing data
 * there — the frontend must not even request it, or the 403 blanks the page.
 */
const FINANCIAL_READ_ROLES: readonly Role[] = ['school_admin', 'secretary', 'accountant'];

export function canReadFinancial(role: Role | undefined): boolean {
  if (!role) return false;
  return FINANCIAL_READ_ROLES.includes(role);
}

/**
 * Mirrors the inline require_role(school_admin, accountant) on GET /reports/export.pdf
 * in backend/app/routers/reports.py. Secretary reads the financial/attendance/grades
 * report tabs (their own READ_ROLES already allow that) but can't export that PDF —
 * hide the button there instead of letting the click 403.
 */
const REPORT_EXPORT_ROLES: readonly Role[] = ['school_admin', 'accountant'];

export function canExportReports(role: Role | undefined): boolean {
  if (!role) return false;
  return REPORT_EXPORT_ROLES.includes(role);
}

/**
 * Mirrors READ_ROLES in backend/app/routers/{attendance,grades}.py — accountant has
 * no read access to a student's grades or présences (attendance.py/grades.py both
 * exclude her). Her job on a student's profile is billing status, not the academic
 * record or pedagogical documents (certificat/carte scolaire, bulletin) — a
 * registrar concern, handled by school_admin/secretary/teacher instead.
 */
const ACADEMIC_READ_ROLES: readonly Role[] = ['school_admin', 'secretary', 'teacher'];

export function canSeeAcademicRecord(role: Role | undefined): boolean {
  if (!role) return false;
  return ACADEMIC_READ_ROLES.includes(role);
}

/**
 * Mirrors require_role(school_admin, secretary) on GET /students/{id}/{bulletin,
 * certificate,id-card}.pdf in backend/app/routers/students.py — generating a
 * student's official documents is a registrar (scolarité) task. Teacher and
 * accountant both reach the student profile but neither can call these endpoints,
 * so the "Générer un document officiel" section must not be offered to them.
 */
const STUDENT_DOCUMENT_ROLES: readonly Role[] = ['school_admin', 'secretary'];

export function canManageStudentDocuments(role: Role | undefined): boolean {
  if (!role) return false;
  return STUDENT_DOCUMENT_ROLES.includes(role);
}
