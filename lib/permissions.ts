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
  grades: ['school_admin', 'teacher'],
  communication: ['school_admin', 'secretary'],
  assignments: ['secretary'],
  timetable: ['secretary'],
  hourly_rates: ['school_admin', 'accountant'],
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
