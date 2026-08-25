import { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiUpload, downloadFile } from './api-client';

// Database row types (snake_case, matching the FastAPI response shapes)
export interface DbSchool {
  id: string;
  nom: string;
  logo: string | null;
  adresse: string;
  telephone: string;
  statut_abonnement: string;
  date_creation: string;
}

export interface DbStudent {
  id: string;
  school_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  photo: string | null;
  classroom_id: string | null;
  statut: string;
}

export interface DbParent {
  id: string;
  school_id: string;
  user_id: string | null;
  nom: string;
  telephone: string;
  email: string | null;
  adresse: string;
  profession: string;
}

export interface DbTeacher {
  id: string;
  school_id: string;
  user_id: string | null;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  matiere_ids: string[];
  classroom_ids: string[];
  statut: string;
}

export interface DbCycle {
  id: string;
  school_id: string;
  nom: string;
  ordre: number;
  evaluation_mode: 'notes' | 'qualitatif';
}

export interface DbLevel {
  id: string;
  school_id: string;
  cycle_id: string;
  nom: string;
  ordre: number;
}

export interface DbClassroom {
  id: string;
  school_id: string;
  level_id: string;
  nom: string;
  salle: string;
  filiere: string | null;
  enseignant_principal_id: string | null;
}

export interface DbSubject {
  id: string;
  school_id: string;
  nom: string;
  coefficient: number;
}

export interface DbEvaluationType {
  id: string;
  school_id: string;
  nom: string;
}

export interface DbTeacherAssignment {
  id: string;
  school_id: string;
  teacher_id: string;
  subject_id: string;
  classroom_id: string;
  academic_year_id: string;
}

export interface DbAttendance {
  id: string;
  school_id: string;
  student_id: string;
  classroom_id: string | null;
  date: string;
  statut: string;
}

export interface DbAssessment {
  id: string;
  school_id: string;
  subject_id: string;
  classroom_id: string;
  term_id: string;
  evaluation_type_id: string | null;
  libelle: string;
  date: string;
  coefficient: number;
}

export interface DbGrade {
  id: string;
  school_id: string;
  assessment_id: string;
  student_id: string;
  note: number | null;
  appreciation: string | null;
  statut_validation: string;
}

export interface DbInvoice {
  id: string;
  school_id: string;
  student_id: string;
  type_frais: string;
  montant_total: number;
  montant_paye: number;
  reste_a_payer: number;
  date_emission: string;
  statut: string;
}

export interface DbPayment {
  id: string;
  school_id: string;
  invoice_id: string;
  montant: number;
  date_paiement: string;
  mode_paiement: string;
  partiel: boolean;
}

export interface DbAcademicYear {
  id: string;
  school_id: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: 'active' | 'archivee';
}

export interface DbTerm {
  id: string;
  school_id: string;
  academic_year_id: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

export interface DbStudentParent {
  id: string;
  school_id: string;
  student_id: string;
  parent_id: string;
}

export interface DbUser {
  id: string;
  school_id: string | null;
  nom: string;
  email: string;
  telephone: string;
  role: string;
  statut: string;
  avatar_url?: string | null;
}

// ── Students ──────────────────────────────────────────────────

export interface StudentInput {
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  classroom_id?: string | null;
  statut?: 'actif' | 'inactif';
}

export const fetchStudents = () => apiGet<DbStudent[]>('/students');
export const fetchStudentById = (id: string) => apiGet<DbStudent>(`/students/${id}`);
export const createStudent = (student: StudentInput) => apiPost<DbStudent>('/students', student);
export const updateStudent = (id: string, updates: Partial<StudentInput>) =>
  apiPatch<DbStudent>(`/students/${id}`, updates);
export const deleteStudent = (id: string) => apiDelete<void>(`/students/${id}`);
export const fetchStudentParents = (studentId: string) => apiGet<DbParent[]>(`/students/${studentId}/parents`);
export const setStudentParents = (studentId: string, parentIds: string[]) =>
  apiPut<void>(`/students/${studentId}/parents`, { parent_ids: parentIds });
export const fetchAllStudentParents = () => apiGet<DbStudentParent[]>('/students/parent-links');

// Student documents module is deferred (out of scope for this pass) — no backend route yet.
export const fetchStudentDocuments = async (_studentId: string) => [] as { id: string; nom: string; type: string; date_ajout: string }[];

export const downloadStudentBulletin = (studentId: string, matricule: string, termId?: string) =>
  downloadFile(`/students/${studentId}/bulletin.pdf${termId ? `?term_id=${termId}` : ''}`, `bulletin-${matricule}.pdf`);

export const downloadStudentCertificate = (studentId: string, matricule: string) =>
  downloadFile(`/students/${studentId}/certificate.pdf`, `certificat-scolarite-${matricule}.pdf`);

export const downloadStudentIdCard = (studentId: string, matricule: string) =>
  downloadFile(`/students/${studentId}/id-card.pdf`, `carte-scolaire-${matricule}.pdf`);

export const exportStudentsCsv = () => downloadFile('/students/export.csv', 'eleves.csv');

export interface StudentImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

export const importStudentsCsv = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<StudentImportResult>('/students/import', formData);
};

// ── Parents ───────────────────────────────────────────────────

export interface ParentInput {
  nom: string;
  telephone?: string;
  email?: string | null;
  adresse?: string;
  profession?: string;
  /** Set to grant/reset a login for this parent (requires email above). */
  password?: string;
}

export const fetchParents = () => apiGet<DbParent[]>('/parents');
export const createParent = (parent: ParentInput) => apiPost<DbParent>('/parents', parent);
export const updateParent = (id: string, updates: Partial<ParentInput>) =>
  apiPatch<DbParent>(`/parents/${id}`, updates);
export const deleteParent = (id: string) => apiDelete<void>(`/parents/${id}`);

// ── Cycles & Levels (École → Cycle → Niveau) ─────────────────

export interface CycleInput {
  nom: string;
  ordre?: number;
  evaluation_mode?: 'notes' | 'qualitatif';
}

export const fetchCycles = () => apiGet<DbCycle[]>('/cycles');
export const createCycle = (cycle: CycleInput) => apiPost<DbCycle>('/cycles', cycle);
export const updateCycle = (id: string, updates: Partial<CycleInput>) => apiPatch<DbCycle>(`/cycles/${id}`, updates);
export const deleteCycle = (id: string) => apiDelete<void>(`/cycles/${id}`);

export interface LevelInput {
  cycle_id: string;
  nom: string;
  ordre?: number;
}

export const fetchLevels = () => apiGet<DbLevel[]>('/levels');
export const createLevel = (level: LevelInput) => apiPost<DbLevel>('/levels', level);
export const updateLevel = (id: string, updates: Partial<LevelInput>) => apiPatch<DbLevel>(`/levels/${id}`, updates);
export const deleteLevel = (id: string) => apiDelete<void>(`/levels/${id}`);

// ── Classrooms & Subjects ────────────────────────────────────

export interface ClassroomInput {
  level_id: string;
  nom: string;
  salle?: string;
  filiere?: string | null;
  enseignant_principal_id?: string | null;
}

export const fetchClassrooms = () => apiGet<DbClassroom[]>('/classrooms');
export const createClassroom = (classroom: ClassroomInput) => apiPost<DbClassroom>('/classrooms', classroom);
export const updateClassroom = (id: string, updates: Partial<ClassroomInput>) =>
  apiPatch<DbClassroom>(`/classrooms/${id}`, updates);
export const deleteClassroom = (id: string) => apiDelete<void>(`/classrooms/${id}`);

export interface SubjectInput {
  nom: string;
  coefficient?: number;
}

export const fetchSubjects = () => apiGet<DbSubject[]>('/subjects');
export const createSubject = (subject: SubjectInput) => apiPost<DbSubject>('/subjects', subject);
export const updateSubject = (id: string, updates: Partial<SubjectInput>) =>
  apiPatch<DbSubject>(`/subjects/${id}`, updates);
export const deleteSubject = (id: string) => apiDelete<void>(`/subjects/${id}`);

// ── Teachers ──────────────────────────────────────────────────

export interface AssignmentPairInput {
  subject_id: string;
  classroom_id: string;
}

export interface TeacherInput {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  statut?: 'actif' | 'inactif';
  assignments?: AssignmentPairInput[];
  /** Set to grant/reset a login for this teacher. */
  password?: string;
}

export const fetchTeachers = () => apiGet<DbTeacher[]>('/teachers');
export const createTeacher = (teacher: TeacherInput) => apiPost<DbTeacher>('/teachers', teacher);
export const updateTeacher = (id: string, updates: Partial<TeacherInput>) =>
  apiPatch<DbTeacher>(`/teachers/${id}`, updates);
export const deleteTeacher = (id: string) => apiDelete<void>(`/teachers/${id}`);

// ── Teacher assignments (standalone management) ──────────────

export const fetchAssignments = (teacherId?: string) =>
  apiGet<DbTeacherAssignment[]>(`/assignments${teacherId ? `?teacher_id=${teacherId}` : ''}`);
export const createAssignment = (assignment: { teacher_id: string; subject_id: string; classroom_id: string; academic_year_id?: string }) =>
  apiPost<DbTeacherAssignment>('/assignments', assignment);
export const deleteAssignment = (id: string) => apiDelete<void>(`/assignments/${id}`);

// ── Attendance ────────────────────────────────────────────────

export interface AttendanceRecordInput {
  student_id: string;
  classroom_id?: string | null;
  date: string;
  statut: 'present' | 'absent' | 'retard' | 'justifie';
}

export function fetchAttendance(params?: { classroom_id?: string; date?: string }) {
  const query = new URLSearchParams();
  if (params?.classroom_id) query.set('classroom_id', params.classroom_id);
  if (params?.date) query.set('date', params.date);
  const qs = query.toString();
  return apiGet<DbAttendance[]>(`/attendance${qs ? `?${qs}` : ''}`);
}

export const upsertAttendance = (records: AttendanceRecordInput[]) =>
  apiPut<DbAttendance[]>('/attendance', { records });

// ── Evaluation types, Assessments & Grades ───────────────────

export const fetchEvaluationTypes = () => apiGet<DbEvaluationType[]>('/evaluation-types');
export const createEvaluationType = (nom: string) => apiPost<DbEvaluationType>('/evaluation-types', { nom });

export interface AssessmentInput {
  subject_id: string;
  classroom_id: string;
  term_id: string;
  evaluation_type_id?: string | null;
  libelle: string;
  date: string;
  coefficient?: number;
}

export const fetchAssessments = () => apiGet<DbAssessment[]>('/assessments');
export const createAssessment = (assessment: AssessmentInput) => apiPost<DbAssessment>('/assessments', assessment);

export interface GradeRecordInput {
  assessment_id: string;
  student_id: string;
  note?: number | null;
  appreciation?: string | null;
  statut_validation?: 'brouillon' | 'valide' | 'publie';
}

export function fetchGrades(params?: { assessment_id?: string }) {
  const qs = params?.assessment_id ? `?assessment_id=${params.assessment_id}` : '';
  return apiGet<DbGrade[]>(`/grades${qs}`);
}

export const upsertGrades = (records: GradeRecordInput[]) => apiPut<DbGrade[]>('/grades', { records });

// ── Invoices & Payments ──────────────────────────────────────

export interface InvoiceInput {
  student_id: string;
  type_frais: 'scolarite' | 'inscription' | 'cantine' | 'transport' | 'autre';
  montant_total: number;
  date_emission?: string;
}

export const fetchInvoices = () => apiGet<DbInvoice[]>('/invoices');
export const createInvoice = (invoice: InvoiceInput) => apiPost<DbInvoice>('/invoices', invoice);

export interface PaymentInput {
  invoice_id: string;
  montant: number;
  mode_paiement: 'especes' | 'cheque' | 'virement' | 'mobile_money' | 'carte_bancaire';
  date_paiement?: string;
}

export const fetchPayments = () => apiGet<DbPayment[]>('/payments');
export const createPayment = (payment: PaymentInput) =>
  apiPost<{ payment: DbPayment; invoice: DbInvoice }>('/payments', payment);
export const downloadPaymentReceipt = (paymentId: string) =>
  downloadFile(`/payments/${paymentId}/receipt.pdf`, `recu-${paymentId.slice(0, 8)}.pdf`);

// ── Academic years / staff / schools ─────────────────────────

export const fetchAcademicYears = () => apiGet<DbAcademicYear[]>('/academic-years');
export const createAcademicYear = (year: { libelle: string; date_debut: string; date_fin: string; activate?: boolean }) =>
  apiPost<DbAcademicYear>('/academic-years', year);
export const activateAcademicYear = (id: string) => apiPost<DbAcademicYear>(`/academic-years/${id}/activate`);
export const fetchTerms = () => apiGet<DbTerm[]>('/academic-years/terms');
export const createTerm = (term: { academic_year_id: string; libelle: string; date_debut: string; date_fin: string }) =>
  apiPost<DbTerm>('/academic-years/terms', term);

export const fetchUsers = () => apiGet<DbUser[]>('/users');

export interface UserCreateInput {
  nom: string;
  email: string;
  password: string;
  telephone?: string;
  role: 'school_admin' | 'secretary' | 'accountant' | 'teacher' | 'parent';
}

export interface UserUpdateInput {
  nom?: string;
  telephone?: string;
  role?: 'school_admin' | 'secretary' | 'accountant';
  statut?: 'actif' | 'inactif';
}

export const createUser = (user: UserCreateInput) => apiPost<DbUser>('/users', user);
export const updateUser = (id: string, updates: UserUpdateInput) => apiPatch<DbUser>(`/users/${id}`, updates);
export const resetUserPassword = (id: string, newPassword: string) =>
  apiPost<void>(`/users/${id}/reset-password`, { new_password: newPassword });

export async function fetchSchools(): Promise<DbSchool[]> {
  const rows = await apiGet<{ id: string; nom: string }[]>('/auth/schools');
  return rows.map(r => ({
    id: r.id,
    nom: r.nom,
    logo: null,
    adresse: '',
    telephone: '',
    statut_abonnement: '',
    date_creation: '',
  }));
}

/** The logged-in user's own school, with full details — not the bare login/signup picker list. */
export const fetchMySchool = () => apiGet<DbSchool | null>('/schools/me');

export interface SchoolSelfUpdateInput {
  nom?: string;
  adresse?: string;
  telephone?: string;
  logo?: string;
}

export const updateMySchool = (updates: SchoolSelfUpdateInput) => apiPatch<DbSchool>('/schools/me', updates);

// ── Super admin: manage all schools + subscriptions ──────────

export interface DbSchoolAdmin {
  id: string;
  nom: string;
  logo: string | null;
  adresse: string;
  telephone: string;
  statut_abonnement: 'actif' | 'essai' | 'expire';
  date_creation: string;
  student_count: number;
  user_count: number;
}

export interface SchoolAdminInput {
  nom: string;
  adresse?: string;
  telephone?: string;
  statut_abonnement?: 'actif' | 'essai' | 'expire';
}

export const fetchAllSchoolsAdmin = () => apiGet<DbSchoolAdmin[]>('/admin/schools');
export const createSchoolAdmin = (school: SchoolAdminInput) => apiPost<DbSchoolAdmin>('/admin/schools', school);
export const updateSchoolAdmin = (id: string, updates: Partial<SchoolAdminInput>) =>
  apiPatch<DbSchoolAdmin>(`/admin/schools/${id}`, updates);

/** Bootstraps the first school_admin login for a given school (super_admin only). */
export const createSchoolAdminUser = (schoolId: string, user: { nom: string; email: string; password: string; telephone?: string }) =>
  apiPost<DbUser>(`/admin/schools/${schoolId}/admin`, { ...user, role: 'school_admin' });

/** Read-only view of every account in a school (all roles). */
export const fetchSchoolUsers = (schoolId: string) => apiGet<DbUser[]>(`/admin/schools/${schoolId}/users`);

/** CRUD is restricted server-side to that school's own school_admin accounts. */
export const updateSchoolAdminUser = (schoolId: string, userId: string, updates: { nom?: string; telephone?: string; statut?: 'actif' | 'inactif' }) =>
  apiPatch<DbUser>(`/admin/schools/${schoolId}/admins/${userId}`, updates);
export const resetSchoolAdminUserPassword = (schoolId: string, userId: string, newPassword: string) =>
  apiPost<void>(`/admin/schools/${schoolId}/admins/${userId}/reset-password`, { new_password: newPassword });

// ── Super admins (platform-level accounts, no school_id) ──────

export interface SuperAdminCreateInput {
  nom: string;
  email: string;
  password: string;
  telephone?: string;
}

export interface SuperAdminUpdateInput {
  nom?: string;
  telephone?: string;
  statut?: 'actif' | 'inactif';
}

export const fetchSuperAdmins = () => apiGet<DbUser[]>('/admin/super-admins');
export const createSuperAdmin = (user: SuperAdminCreateInput) => apiPost<DbUser>('/admin/super-admins', user);
export const updateSuperAdmin = (id: string, updates: SuperAdminUpdateInput) =>
  apiPatch<DbUser>(`/admin/super-admins/${id}`, updates);
export const resetSuperAdminPassword = (id: string, newPassword: string) =>
  apiPost<void>(`/admin/super-admins/${id}/reset-password`, { new_password: newPassword });

// ── Parent portal (scoped to the logged-in parent's own children) ──

export const fetchMyChildren = () => apiGet<DbStudent[]>('/parent/children');
export const fetchChildGrades = (studentId: string) => apiGet<DbGrade[]>(`/parent/children/${studentId}/grades`);
export const fetchChildAssessments = (studentId: string) =>
  apiGet<DbAssessment[]>(`/parent/children/${studentId}/assessments`);
export const fetchChildAttendance = (studentId: string) =>
  apiGet<DbAttendance[]>(`/parent/children/${studentId}/attendance`);
export const fetchChildInvoices = (studentId: string) =>
  apiGet<DbInvoice[]>(`/parent/children/${studentId}/invoices`);
export const fetchChildPayments = (studentId: string) =>
  apiGet<DbPayment[]>(`/parent/children/${studentId}/payments`);
export const downloadChildBulletin = (studentId: string, matricule: string, termId?: string) =>
  downloadFile(`/parent/children/${studentId}/bulletin.pdf${termId ? `?term_id=${termId}` : ''}`, `bulletin-${matricule}.pdf`);

// ── Audit log (school_admin: own school · super_admin: platform-level entries) ──

export interface DbAuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  actor_nom: string | null;
  actor_email: string | null;
}

export const fetchAuditLogs = (params: { limit?: number; offset?: number; action?: string; entity_type?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  if (params.action) qs.set('action', params.action);
  if (params.entity_type) qs.set('entity_type', params.entity_type);
  const query = qs.toString();
  return apiGet<{ total: number; items: DbAuditLogEntry[] }>(`/audit-logs${query ? `?${query}` : ''}`);
};

// Notifications (SMS/email delivery log) remain out of scope — no backend route yet.
export const fetchNotifications = async () => [] as {
  id: string;
  school_id: string;
  type: string;
  destinataire_id: string;
  canal: string;
  message: string;
  statut: string;
  date: string;
}[];

export interface DbAnnouncement {
  id: string;
  school_id: string;
  auteur_id: string | null;
  auteur_nom: string;
  cible: 'tous' | 'parents' | 'enseignants' | 'classe';
  titre: string;
  contenu: string;
  date_publication: string;
}

export interface AnnouncementInput {
  titre: string;
  contenu: string;
  cible: 'tous' | 'parents' | 'enseignants' | 'classe';
}

export const fetchAnnouncements = () => apiGet<DbAnnouncement[]>('/announcements');
export const createAnnouncement = (announcement: AnnouncementInput) => apiPost<DbAnnouncement>('/announcements', announcement);
export const deleteAnnouncement = (id: string) => apiDelete<void>(`/announcements/${id}`);

// ── Reports export ────────────────────────────────────────────

export const downloadReportPdf = (type: 'financial' | 'attendance' | 'grades', dateFrom?: string, dateTo?: string) => {
  const qs = new URLSearchParams({ type });
  if (dateFrom) qs.set('date_from', dateFrom);
  if (dateTo) qs.set('date_to', dateTo);
  return downloadFile(`/reports/export.pdf?${qs.toString()}`, `rapport-${type}.pdf`);
};

// ── Helpers ───────────────────────────────────────────────────

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
}
