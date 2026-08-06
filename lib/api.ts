import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from './api-client';

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

export interface DbClassroom {
  id: string;
  school_id: string;
  niveau: string;
  nom: string;
  salle: string;
  enseignant_principal_id: string | null;
}

export interface DbSubject {
  id: string;
  school_id: string;
  nom: string;
  coefficient: number;
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
  libelle: string;
  date: string;
  coefficient: number;
}

export interface DbGrade {
  id: string;
  school_id: string;
  assessment_id: string;
  student_id: string;
  note: number;
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
  statut: string;
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

// ── Parents ───────────────────────────────────────────────────

export interface ParentInput {
  nom: string;
  telephone?: string;
  email?: string | null;
  adresse?: string;
  profession?: string;
}

export const fetchParents = () => apiGet<DbParent[]>('/parents');
export const createParent = (parent: ParentInput) => apiPost<DbParent>('/parents', parent);
export const updateParent = (id: string, updates: Partial<ParentInput>) =>
  apiPatch<DbParent>(`/parents/${id}`, updates);
export const deleteParent = (id: string) => apiDelete<void>(`/parents/${id}`);

// ── Classrooms & Subjects ────────────────────────────────────

export interface ClassroomInput {
  niveau: string;
  nom: string;
  salle?: string;
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

export interface TeacherInput {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  statut?: 'actif' | 'inactif';
  matiere_ids?: string[];
  classroom_ids?: string[];
}

export const fetchTeachers = () => apiGet<DbTeacher[]>('/teachers');
export const createTeacher = (teacher: TeacherInput) => apiPost<DbTeacher>('/teachers', teacher);
export const updateTeacher = (id: string, updates: Partial<TeacherInput>) =>
  apiPatch<DbTeacher>(`/teachers/${id}`, updates);
export const deleteTeacher = (id: string) => apiDelete<void>(`/teachers/${id}`);

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

// ── Assessments & Grades ─────────────────────────────────────

export interface AssessmentInput {
  subject_id: string;
  classroom_id: string;
  term_id: string;
  libelle: string;
  date: string;
  coefficient?: number;
}

export const fetchAssessments = () => apiGet<DbAssessment[]>('/assessments');
export const createAssessment = (assessment: AssessmentInput) => apiPost<DbAssessment>('/assessments', assessment);

export interface GradeRecordInput {
  assessment_id: string;
  student_id: string;
  note: number;
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

// ── Academic years / staff / schools ─────────────────────────

export const fetchAcademicYears = () => apiGet<DbAcademicYear[]>('/academic-years');
export const fetchUsers = () => apiGet<DbUser[]>('/users');

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

// Communication module is deferred (out of scope for this pass) — no backend routes yet.
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

export const fetchAnnouncements = async () => [] as {
  id: string;
  school_id: string;
  auteur_id: string | null;
  auteur_nom: string;
  cible: string;
  titre: string;
  contenu: string;
  date_publication: string;
}[];

export const createAnnouncement = async (_announcement: {
  auteur_id: string;
  auteur_nom: string;
  cible: string;
  titre: string;
  contenu: string;
}) => {
  throw new Error('Le module Communication n\'est pas encore disponible.');
};

// ── Helpers ───────────────────────────────────────────────────

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
}
