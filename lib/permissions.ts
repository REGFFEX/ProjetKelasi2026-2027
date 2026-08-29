import { Role } from './types';

/**
 * Mirrors each backend router's WRITE_ROLES tuple, so the frontend can hide
 * create/edit/delete controls a role can't actually use instead of showing
 * them and letting the request 403. Keep in sync with the source of truth:
 * the WRITE_ROLES constant at the top of each backend/app/routers/*.py file.
 */
const WRITE_ROLES = {
  classrooms: ['school_admin'],
  subjects: ['school_admin'],
  teachers: ['school_admin'],
  students: ['school_admin', 'secretary'],
  parents: ['school_admin', 'secretary'],
  payments: ['school_admin', 'accountant'],
  invoices: ['school_admin', 'accountant'],
  cycles: ['school_admin'],
  levels: ['school_admin'],
  academic_years: ['school_admin'],
  attendance: ['school_admin', 'secretary', 'teacher'],
  grades: ['school_admin', 'teacher'],
  communication: ['school_admin', 'secretary'],
  assignments: ['school_admin'],
} as const satisfies Record<string, readonly Role[]>;

export type WritableResource = keyof typeof WRITE_ROLES;

export function canWrite(role: Role | undefined, resource: WritableResource): boolean {
  if (!role) return false;
  return (WRITE_ROLES[resource] as readonly Role[]).includes(role);
}
