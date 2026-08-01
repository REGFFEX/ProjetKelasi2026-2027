import { supabase } from './supabase';

// Database row types (snake_case from Postgres)
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

export interface DbNotification {
  id: string;
  school_id: string;
  type: string;
  destinataire_id: string;
  canal: string;
  message: string;
  statut: string;
  date: string;
}

export interface DbAnnouncement {
  id: string;
  school_id: string;
  auteur_id: string | null;
  auteur_nom: string;
  cible: string;
  titre: string;
  contenu: string;
  date_publication: string;
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

// ── Mock & Fallback Datasets ─────────────────────────────────

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

export const MOCK_SCHOOLS: DbSchool[] = [
  {
    id: SCHOOL_ID,
    nom: 'École Mixte Lumumba',
    logo: '',
    adresse: 'Av. de la Victoire, Kinshasa',
    telephone: '+243 81 234 5678',
    statut_abonnement: 'actif',
    date_creation: '2021-09-01',
  },
];

export const MOCK_CLASSROOMS: DbClassroom[] = [
  { id: 'c1', school_id: SCHOOL_ID, niveau: 'Maternelle', nom: '1ère Maternelle', salle: 'Salle M1', enseignant_principal_id: 't1' },
  { id: 'c2', school_id: SCHOOL_ID, niveau: 'Primaire', nom: '6ème Primaire A', salle: 'Salle P6A', enseignant_principal_id: 't2' },
  { id: 'c3', school_id: SCHOOL_ID, niveau: 'Primaire', nom: '6ème Primaire B', salle: 'Salle P6B', enseignant_principal_id: 't3' },
  { id: 'c4', school_id: SCHOOL_ID, niveau: 'Secondaire', nom: '1ère Humanités Math-Physique', salle: 'Salle H1MP', enseignant_principal_id: 't1' },
  { id: 'c5', school_id: SCHOOL_ID, niveau: 'Secondaire', nom: '2ème Humanités Littéraire', salle: 'Salle H2L', enseignant_principal_id: 't4' },
  { id: 'c6', school_id: SCHOOL_ID, niveau: 'Secondaire', nom: '4ème Humanités Chim-Bio', salle: 'Salle H4CB', enseignant_principal_id: 't5' },
];

export const MOCK_SUBJECTS: DbSubject[] = [
  { id: 'sub1', school_id: SCHOOL_ID, nom: 'Mathématiques', coefficient: 4 },
  { id: 'sub2', school_id: SCHOOL_ID, nom: 'Français', coefficient: 4 },
  { id: 'sub3', school_id: SCHOOL_ID, nom: 'Histoire-Géographie', coefficient: 2 },
  { id: 'sub4', school_id: SCHOOL_ID, nom: 'Sciences', coefficient: 3 },
  { id: 'sub5', school_id: SCHOOL_ID, nom: 'Anglais', coefficient: 2 },
  { id: 'sub6', school_id: SCHOOL_ID, nom: 'EPS', coefficient: 1 },
  { id: 'sub7', school_id: SCHOOL_ID, nom: 'Informatique', coefficient: 2 },
  { id: 'sub8', school_id: SCHOOL_ID, nom: 'Religion', coefficient: 1 },
  { id: 'sub9', school_id: SCHOOL_ID, nom: 'Éducation artistique', coefficient: 1 },
];

export const MOCK_TEACHERS: DbTeacher[] = [
  { id: 't1', school_id: SCHOOL_ID, user_id: null, nom: 'Tshala', prenom: 'Esther', email: 'esther.tshala@kelasi.cd', telephone: '+243 81 555 6666', matiere_ids: ['sub1', 'sub7'], classroom_ids: ['c1', 'c4'], statut: 'actif' },
  { id: 't2', school_id: SCHOOL_ID, user_id: null, nom: 'Mpeza', prenom: 'David', email: 'david.mpeza@kelasi.cd', telephone: '+243 81 999 1010', matiere_ids: ['sub2', 'sub5'], classroom_ids: ['c2'], statut: 'actif' },
  { id: 't3', school_id: SCHOOL_ID, user_id: null, nom: 'Nkulu', prenom: 'Sarah', email: 'sarah.nkulu@kelasi.cd', telephone: '+243 82 121 3141', matiere_ids: ['sub4'], classroom_ids: ['c3'], statut: 'actif' },
  { id: 't4', school_id: SCHOOL_ID, user_id: null, nom: 'Bakwa', prenom: 'Michel', email: 'michel.bakwa@kelasi.cd', telephone: '+243 82 343 5454', matiere_ids: ['sub3'], classroom_ids: ['c5'], statut: 'actif' },
  { id: 't5', school_id: SCHOOL_ID, user_id: null, nom: 'Mbuyi', prenom: 'Jeanne', email: 'jeanne.mbuyi@kelasi.cd', telephone: '+243 81 565 6767', matiere_ids: ['sub6', 'sub9'], classroom_ids: ['c6'], statut: 'actif' },
];

export const MOCK_PARENTS: DbParent[] = [
  { id: 'p1', school_id: SCHOOL_ID, nom: 'Jean Mukendi', telephone: '+243 81 234 5678', email: 'jean.m@gmail.com', adresse: 'Matonge, Kinshasa', profession: 'Commerçant' },
  { id: 'p2', school_id: SCHOOL_ID, nom: 'Adèle Kabongo', telephone: '+243 82 345 6789', email: 'adele.k@gmail.com', adresse: 'Lemba, Kinshasa', profession: 'Infirmière' },
  { id: 'p3', school_id: SCHOOL_ID, nom: 'Félix Mwamba', telephone: '+243 85 456 7890', email: 'felix.m@gmail.com', adresse: 'Bandalungwa, Kinshasa', profession: 'Chauffeur' },
  { id: 'p4', school_id: SCHOOL_ID, nom: 'Claire Ntumba', telephone: '+243 89 567 8901', email: 'claire.n@gmail.com', adresse: 'Ngaliema, Kinshasa', profession: 'Enseignante' },
  { id: 'p5', school_id: SCHOOL_ID, nom: 'Patrick Ilunga', telephone: '+243 81 678 9012', email: 'patrick.i@gmail.com', adresse: 'Kintambo, Kinshasa', profession: 'Mécanicien' },
  { id: 'p6', school_id: SCHOOL_ID, nom: 'Brigitte Kasongo', telephone: '+243 82 789 0123', email: 'brigitte.k@gmail.com', adresse: 'Gombe, Kinshasa', profession: 'Secrétaire' },
  { id: 'p7', school_id: SCHOOL_ID, nom: 'Augustin Mwenze', telephone: '+243 85 890 1234', email: 'augustin.m@gmail.com', adresse: 'Ngaba, Kinshasa', profession: 'Avocat' },
  { id: 'p8', school_id: SCHOOL_ID, nom: 'Solange Tshibangu', telephone: '+243 89 901 2345', email: 'solange.t@gmail.com', adresse: 'Selembao, Kinshasa', profession: 'Coiffeuse' },
  { id: 'p9', school_id: SCHOOL_ID, nom: 'Robert Lukusa', telephone: '+243 81 012 3456', email: 'robert.l@gmail.com', adresse: 'Matonge, Kinshasa', profession: 'Comptable' },
  { id: 'p10', school_id: SCHOOL_ID, nom: 'Nadine Mbiya', telephone: '+243 82 123 4567', email: 'nadine.m@gmail.com', adresse: 'Lemba, Kinshasa', profession: 'Vendeuse' },
];

export const MOCK_STUDENTS: DbStudent[] = [
  { id: 's1', school_id: SCHOOL_ID, matricule: 'MAT-2026-001', nom: 'Mukendi', prenom: 'Aimé', date_naissance: '2015-03-12', photo: null, classroom_id: 'c2', statut: 'actif' },
  { id: 's2', school_id: SCHOOL_ID, matricule: 'MAT-2026-002', nom: 'Kabongo', prenom: 'Béatrice', date_naissance: '2015-07-22', photo: null, classroom_id: 'c2', statut: 'actif' },
  { id: 's3', school_id: SCHOOL_ID, matricule: 'MAT-2026-003', nom: 'Mwamba', prenom: 'Christian', date_naissance: '2014-11-05', photo: null, classroom_id: 'c3', statut: 'actif' },
  { id: 's4', school_id: SCHOOL_ID, matricule: 'MAT-2026-004', nom: 'Ntumba', prenom: 'Divine', date_naissance: '2015-01-18', photo: null, classroom_id: 'c2', statut: 'actif' },
  { id: 's5', school_id: SCHOOL_ID, matricule: 'MAT-2026-005', nom: 'Ilunga', prenom: 'Emmanuel', date_naissance: '2012-09-30', photo: null, classroom_id: 'c4', statut: 'actif' },
  { id: 's6', school_id: SCHOOL_ID, matricule: 'MAT-2026-006', nom: 'Kasongo', prenom: 'Fanny', date_naissance: '2011-04-14', photo: null, classroom_id: 'c5', statut: 'actif' },
  { id: 's7', school_id: SCHOOL_ID, matricule: 'MAT-2026-007', nom: 'Mwenze', prenom: 'Gloire', date_naissance: '2009-08-25', photo: null, classroom_id: 'c6', statut: 'actif' },
  { id: 's8', school_id: SCHOOL_ID, matricule: 'MAT-2026-008', nom: 'Tshibangu', prenom: 'Hélène', date_naissance: '2020-02-10', photo: null, classroom_id: 'c1', statut: 'actif' },
  { id: 's9', school_id: SCHOOL_ID, matricule: 'MAT-2026-009', nom: 'Lukusa', prenom: 'Iris', date_naissance: '2015-06-19', photo: null, classroom_id: 'c2', statut: 'actif' },
  { id: 's10', school_id: SCHOOL_ID, matricule: 'MAT-2026-010', nom: 'Mbiya', prenom: 'Joël', date_naissance: '2012-12-01', photo: null, classroom_id: 'c4', statut: 'actif' },
  { id: 's11', school_id: SCHOOL_ID, matricule: 'MAT-2026-011', nom: 'Bofando', prenom: 'Kévin', date_naissance: '2015-05-08', photo: null, classroom_id: 'c3', statut: 'actif' },
  { id: 's12', school_id: SCHOOL_ID, matricule: 'MAT-2026-012', nom: 'Mukeba', prenom: 'Larissa', date_naissance: '2011-10-17', photo: null, classroom_id: 'c5', statut: 'actif' },
  { id: 's13', school_id: SCHOOL_ID, matricule: 'MAT-2026-013', nom: 'Kasawu', prenom: 'Marc', date_naissance: '2009-03-29', photo: null, classroom_id: 'c6', statut: 'actif' },
  { id: 's14', school_id: SCHOOL_ID, matricule: 'MAT-2026-014', nom: 'Bakwa', prenom: 'Nadège', date_naissance: '2020-09-11', photo: null, classroom_id: 'c1', statut: 'actif' },
  { id: 's15', school_id: SCHOOL_ID, matricule: 'MAT-2026-015', nom: 'Nkulu', prenom: 'Olivier', date_naissance: '2014-04-03', photo: null, classroom_id: 'c3', statut: 'actif' },
];

export const MOCK_STUDENT_PARENTS: DbStudentParent[] = [
  { id: 'sp1', school_id: SCHOOL_ID, student_id: 's1', parent_id: 'p1' },
  { id: 'sp2', school_id: SCHOOL_ID, student_id: 's2', parent_id: 'p2' },
  { id: 'sp3', school_id: SCHOOL_ID, student_id: 's3', parent_id: 'p3' },
  { id: 'sp4', school_id: SCHOOL_ID, student_id: 's4', parent_id: 'p4' },
  { id: 'sp5', school_id: SCHOOL_ID, student_id: 's5', parent_id: 'p5' },
  { id: 'sp6', school_id: SCHOOL_ID, student_id: 's6', parent_id: 'p6' },
  { id: 'sp7', school_id: SCHOOL_ID, student_id: 's7', parent_id: 'p7' },
  { id: 'sp8', school_id: SCHOOL_ID, student_id: 's8', parent_id: 'p8' },
  { id: 'sp9', school_id: SCHOOL_ID, student_id: 's9', parent_id: 'p9' },
  { id: 'sp10', school_id: SCHOOL_ID, student_id: 's10', parent_id: 'p10' },
];

const today = new Date().toISOString().split('T')[0];

export const MOCK_ATTENDANCE: DbAttendance[] = MOCK_STUDENTS.map((s, idx) => ({
  id: `att-${s.id}`,
  school_id: SCHOOL_ID,
  student_id: s.id,
  classroom_id: s.classroom_id,
  date: today,
  statut: idx % 7 === 0 ? 'absent' : idx % 5 === 0 ? 'retard' : idx % 9 === 0 ? 'justifie' : 'present',
}));

export const MOCK_ACADEMIC_YEARS: DbAcademicYear[] = [
  { id: 'ay1', school_id: SCHOOL_ID, libelle: '2026-2027', date_debut: '2026-09-01', date_fin: '2027-07-15', statut: 'active' },
  { id: 'ay2', school_id: SCHOOL_ID, libelle: '2025-2026', date_debut: '2025-09-01', date_fin: '2026-07-15', statut: 'archivee' },
];

export const MOCK_ASSESSMENTS: DbAssessment[] = [
  { id: 'ass1', school_id: SCHOOL_ID, subject_id: 'sub1', classroom_id: 'c2', term_id: 'term1', libelle: 'Interrogation Math 1', date: today, coefficient: 1 },
  { id: 'ass2', school_id: SCHOOL_ID, subject_id: 'sub2', classroom_id: 'c2', term_id: 'term1', libelle: 'Examen Français T1', date: today, coefficient: 2 },
  { id: 'ass3', school_id: SCHOOL_ID, subject_id: 'sub4', classroom_id: 'c4', term_id: 'term1', libelle: 'TP Physique-Chimie', date: today, coefficient: 1 },
];

export const MOCK_GRADES: DbGrade[] = [
  { id: 'g1', school_id: SCHOOL_ID, assessment_id: 'ass1', student_id: 's1', note: 16.5, statut_validation: 'valide' },
  { id: 'g2', school_id: SCHOOL_ID, assessment_id: 'ass1', student_id: 's2', note: 14.0, statut_validation: 'valide' },
  { id: 'g3', school_id: SCHOOL_ID, assessment_id: 'ass1', student_id: 's4', note: 18.0, statut_validation: 'valide' },
  { id: 'g4', school_id: SCHOOL_ID, assessment_id: 'ass2', student_id: 's1', note: 15.0, statut_validation: 'valide' },
  { id: 'g5', school_id: SCHOOL_ID, assessment_id: 'ass2', student_id: 's2', note: 13.5, statut_validation: 'valide' },
  { id: 'g6', school_id: SCHOOL_ID, assessment_id: 'ass3', student_id: 's5', note: 17.5, statut_validation: 'valide' },
];

export const MOCK_INVOICES: DbInvoice[] = [
  { id: 'inv1', school_id: SCHOOL_ID, student_id: 's1', type_frais: 'scolarite', montant_total: 150000, montant_paye: 150000, reste_a_payer: 0, date_emission: '2026-09-01', statut: 'paye' },
  { id: 'inv2', school_id: SCHOOL_ID, student_id: 's2', type_frais: 'scolarite', montant_total: 150000, montant_paye: 100000, reste_a_payer: 50000, date_emission: '2026-09-01', statut: 'partiel' },
  { id: 'inv3', school_id: SCHOOL_ID, student_id: 's3', type_frais: 'scolarite', montant_total: 150000, montant_paye: 0, reste_a_payer: 150000, date_emission: '2026-09-01', statut: 'en_attente' },
  { id: 'inv4', school_id: SCHOOL_ID, student_id: 's4', type_frais: 'cantine', montant_total: 45000, montant_paye: 45000, reste_a_payer: 0, date_emission: '2026-09-05', statut: 'paye' },
  { id: 'inv5', school_id: SCHOOL_ID, student_id: 's5', type_frais: 'transport', montant_total: 60000, montant_paye: 30000, reste_a_payer: 30000, date_emission: '2026-09-05', statut: 'partiel' },
];

export const MOCK_PAYMENTS: DbPayment[] = [
  { id: 'pay1', school_id: SCHOOL_ID, invoice_id: 'inv1', montant: 150000, date_paiement: today, mode_paiement: 'mobile_money', partiel: false },
  { id: 'pay2', school_id: SCHOOL_ID, invoice_id: 'inv2', montant: 100000, date_paiement: today, mode_paiement: 'especes', partiel: true },
  { id: 'pay3', school_id: SCHOOL_ID, invoice_id: 'inv4', montant: 45000, date_paiement: today, mode_paiement: 'carte_bancaire', partiel: false },
  { id: 'pay4', school_id: SCHOOL_ID, invoice_id: 'inv5', montant: 30000, date_paiement: today, mode_paiement: 'mobile_money', partiel: true },
];

export const MOCK_NOTIFICATIONS: DbNotification[] = [
  { id: 'n1', school_id: SCHOOL_ID, type: 'absence', destinataire_id: 'p3', canal: 'sms', message: 'Votre enfant Christian Mwamba a été signalé absent aujourd\'hui.', statut: 'envoye', date: today },
  { id: 'n2', school_id: SCHOOL_ID, type: 'facture', destinataire_id: 'p2', canal: 'whatsapp', message: 'Rappel: Solde restant de 50.000 FC pour les frais de scolarité de Béatrice.', statut: 'envoye', date: today },
  { id: 'n3', school_id: SCHOOL_ID, type: 'bulletin', destinataire_id: 'p1', canal: 'app', message: 'Le bulletin du 1er Trimestre de Aimé Mukendi est disponible.', statut: 'envoye', date: today },
];

export const MOCK_ANNOUNCEMENTS: DbAnnouncement[] = [
  { id: 'ann1', school_id: SCHOOL_ID, auteur_id: 'u1', auteur_nom: 'Direction Lumumba', cible: 'tous', titre: 'Réunion des parents d\'élèves', contenu: 'Chers parents, la grande réunion trimestrielle aura lieu ce samedi à 10h au grand hall de l\'établissement.', date_publication: today },
  { id: 'ann2', school_id: SCHOOL_ID, auteur_id: 'u1', auteur_nom: 'Secrétariat Général', cible: 'parents', titre: 'Paiement de la 2ème tranche des frais', contenu: 'Veuillez régulariser la 2ème tranche des frais de scolarité avant le 15 du mois.', date_publication: today },
  { id: 'ann3', school_id: SCHOOL_ID, auteur_id: 'u2', auteur_nom: 'Tshala Esther (Prof. Math)', cible: 'enseignants', titre: 'remise des cahiers de cotes', contenu: 'Merci de transmettre les fiches de cotation trimestrielles avant le vendredi 17h.', date_publication: today },
];

export const MOCK_USERS = [
  { id: 'u1', school_id: SCHOOL_ID, nom: 'Joseph Kabasele', email: 'directeur@kelasi.cd', telephone: '+243 81 000 0001', role: 'school_admin', statut: 'actif' },
  { id: 'u2', school_id: SCHOOL_ID, nom: 'Marie Kalala', email: 'secretaire@kelasi.cd', telephone: '+243 81 000 0002', role: 'secretary', statut: 'actif' },
  { id: 'u3', school_id: SCHOOL_ID, nom: 'Paul Mukendi', email: 'comptable@kelasi.cd', telephone: '+243 81 000 0003', role: 'accountant', statut: 'actif' },
  { id: 'u4', school_id: SCHOOL_ID, nom: 'Esther Tshala', email: 'prof.esther@kelasi.cd', telephone: '+243 81 555 6666', role: 'teacher', statut: 'actif' },
  { id: 'u5', school_id: SCHOOL_ID, nom: 'Jean Mukendi', email: 'parent.jean@kelasi.cd', telephone: '+243 81 234 5678', role: 'parent', statut: 'actif' },
];

// ── Fetch functions ──────────────────────────────────────────

export async function fetchSchools() {
  try {
    const { data, error } = await supabase.from('schools').select('*');
    if (!error && data && data.length > 0) return data as DbSchool[];
  } catch (e) {
    console.warn('Fetch fallback schools:', e);
  }
  return MOCK_SCHOOLS;
}

export async function fetchStudents() {
  try {
    const { data, error } = await supabase.from('students').select('*').order('nom');
    if (!error && data && data.length > 0) return data as DbStudent[];
  } catch (e) {
    console.warn('Fetch fallback students:', e);
  }
  return MOCK_STUDENTS;
}

export async function fetchStudentById(id: string) {
  try {
    const { data, error } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
    if (!error && data) return data as DbStudent;
  } catch (e) {
    console.warn('Fetch fallback student by id:', e);
  }
  return MOCK_STUDENTS.find(s => s.id === id) || MOCK_STUDENTS[0];
}

export async function fetchStudentParents(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('student_parents')
      .select('parent_id')
      .eq('student_id', studentId);
    if (!error && data && data.length > 0) {
      const parentIds = (data as DbStudentParent[]).map(sp => sp.parent_id);
      const { data: parents, error: pErr } = await supabase.from('parents').select('*').in('id', parentIds);
      if (!pErr && parents && parents.length > 0) return parents as DbParent[];
    }
  } catch (e) {
    console.warn('Fetch fallback student parents:', e);
  }
  const linkedParentIds = MOCK_STUDENT_PARENTS.filter(sp => sp.student_id === studentId).map(sp => sp.parent_id);
  return MOCK_PARENTS.filter(p => linkedParentIds.includes(p.id));
}

export async function fetchStudentDocuments(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId);
    if (!error && data) return data;
  } catch (e) {
    console.warn('Fetch fallback student docs:', e);
  }
  return [];
}

export async function fetchParents() {
  try {
    const { data, error } = await supabase.from('parents').select('*').order('nom');
    if (!error && data && data.length > 0) return data as DbParent[];
  } catch (e) {
    console.warn('Fetch fallback parents:', e);
  }
  return MOCK_PARENTS;
}

export async function fetchTeachers() {
  try {
    const { data, error } = await supabase.from('teachers').select('*').order('nom');
    if (!error && data && data.length > 0) return data as DbTeacher[];
  } catch (e) {
    console.warn('Fetch fallback teachers:', e);
  }
  return MOCK_TEACHERS;
}

export async function fetchClassrooms() {
  try {
    const { data, error } = await supabase.from('classrooms').select('*').order('nom');
    if (!error && data && data.length > 0) return data as DbClassroom[];
  } catch (e) {
    console.warn('Fetch fallback classrooms:', e);
  }
  return MOCK_CLASSROOMS;
}

export async function fetchSubjects() {
  try {
    const { data, error } = await supabase.from('subjects').select('*').order('nom');
    if (!error && data && data.length > 0) return data as DbSubject[];
  } catch (e) {
    console.warn('Fetch fallback subjects:', e);
  }
  return MOCK_SUBJECTS;
}

export async function fetchAttendance() {
  try {
    const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    if (!error && data && data.length > 0) return data as DbAttendance[];
  } catch (e) {
    console.warn('Fetch fallback attendance:', e);
  }
  return MOCK_ATTENDANCE;
}

export async function fetchAssessments() {
  try {
    const { data, error } = await supabase.from('assessments').select('*').order('date', { ascending: false });
    if (!error && data && data.length > 0) return data as DbAssessment[];
  } catch (e) {
    console.warn('Fetch fallback assessments:', e);
  }
  return MOCK_ASSESSMENTS;
}

export async function fetchGrades() {
  try {
    const { data, error } = await supabase.from('grades').select('*');
    if (!error && data && data.length > 0) return data as DbGrade[];
  } catch (e) {
    console.warn('Fetch fallback grades:', e);
  }
  return MOCK_GRADES;
}

export async function fetchInvoices() {
  try {
    const { data, error } = await supabase.from('invoices').select('*').order('date_emission', { ascending: false });
    if (!error && data && data.length > 0) return data as DbInvoice[];
  } catch (e) {
    console.warn('Fetch fallback invoices:', e);
  }
  return MOCK_INVOICES;
}

export async function fetchPayments() {
  try {
    const { data, error } = await supabase.from('payments').select('*').order('date_paiement', { ascending: false });
    if (!error && data && data.length > 0) return data as DbPayment[];
  } catch (e) {
    console.warn('Fetch fallback payments:', e);
  }
  return MOCK_PAYMENTS;
}

export async function fetchNotifications() {
  try {
    const { data, error } = await supabase.from('notifications').select('*').order('date', { ascending: false });
    if (!error && data && data.length > 0) return data as DbNotification[];
  } catch (e) {
    console.warn('Fetch fallback notifications:', e);
  }
  return MOCK_NOTIFICATIONS;
}

export async function fetchAnnouncements() {
  try {
    const { data, error } = await supabase.from('announcements').select('*').order('date_publication', { ascending: false });
    if (!error && data && data.length > 0) return data as DbAnnouncement[];
  } catch (e) {
    console.warn('Fetch fallback announcements:', e);
  }
  return MOCK_ANNOUNCEMENTS;
}

export async function fetchAcademicYears() {
  try {
    const { data, error } = await supabase.from('academic_years').select('*').order('date_debut', { ascending: false });
    if (!error && data && data.length > 0) return data as DbAcademicYear[];
  } catch (e) {
    console.warn('Fetch fallback academic years:', e);
  }
  return MOCK_ACADEMIC_YEARS;
}

export async function fetchAllStudentParents() {
  try {
    const { data, error } = await supabase.from('student_parents').select('*');
    if (!error && data && data.length > 0) return data as DbStudentParent[];
  } catch (e) {
    console.warn('Fetch fallback student parents all:', e);
  }
  return MOCK_STUDENT_PARENTS;
}

export async function fetchUsers() {
  try {
    const { data, error } = await supabase.from('users').select('*').order('nom');
    if (!error && data && data.length > 0) return data;
  } catch (e) {
    console.warn('Fetch fallback users:', e);
  }
  return MOCK_USERS;
}

// ── Mutations ─────────────────────────────────────────────────

export async function createStudent(student: {
  school_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  classroom_id: string;
  statut: string;
}) {
  try {
    const { data, error } = await supabase.from('students').insert(student).select().single();
    if (!error && data) return data;
  } catch (e) {
    console.warn('Mutation fallback createStudent:', e);
  }
  const newStudent: DbStudent = {
    id: 's-' + Date.now(),
    photo: null,
    ...student,
  };
  MOCK_STUDENTS.unshift(newStudent);
  return newStudent;
}

export async function updateStudent(id: string, updates: Record<string, unknown>) {
  try {
    const { data, error } = await supabase.from('students').update(updates).eq('id', id).select().single();
    if (!error && data) return data;
  } catch (e) {
    console.warn('Mutation fallback updateStudent:', e);
  }
  const student = MOCK_STUDENTS.find(s => s.id === id);
  if (student) {
    Object.assign(student, updates);
    return student;
  }
  return { id, ...updates };
}

export async function deleteStudent(id: string) {
  try {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) return;
  } catch (e) {
    console.warn('Mutation fallback deleteStudent:', e);
  }
  const idx = MOCK_STUDENTS.findIndex(s => s.id === id);
  if (idx !== -1) MOCK_STUDENTS.splice(idx, 1);
}

export async function createPayment(payment: {
  school_id: string;
  invoice_id: string;
  montant: number;
  mode_paiement: string;
  partiel: boolean;
}) {
  try {
    const { data, error } = await supabase.from('payments').insert(payment).select().single();
    if (!error && data) return data;
  } catch (e) {
    console.warn('Mutation fallback createPayment:', e);
  }
  const newPay: DbPayment = {
    id: 'pay-' + Date.now(),
    date_paiement: new Date().toISOString().split('T')[0],
    ...payment,
  };
  MOCK_PAYMENTS.unshift(newPay);

  const inv = MOCK_INVOICES.find(i => i.id === payment.invoice_id);
  if (inv) {
    inv.montant_paye += payment.montant;
    inv.reste_a_payer = Math.max(0, inv.montant_total - inv.montant_paye);
    inv.statut = inv.reste_a_payer === 0 ? 'paye' : 'partiel';
  }
  return newPay;
}

export async function createAnnouncement(announcement: {
  school_id: string;
  auteur_id: string;
  auteur_nom: string;
  cible: string;
  titre: string;
  contenu: string;
}) {
  try {
    const { data, error } = await supabase.from('announcements').insert(announcement).select().single();
    if (!error && data) return data;
  } catch (e) {
    console.warn('Mutation fallback createAnnouncement:', e);
  }
  const newAnn: DbAnnouncement = {
    id: 'ann-' + Date.now(),
    date_publication: new Date().toISOString().split('T')[0],
    ...announcement,
  };
  MOCK_ANNOUNCEMENTS.unshift(newAnn);
  return newAnn;
}

export async function upsertAttendance(records: {
  school_id: string;
  student_id: string;
  classroom_id: string;
  date: string;
  statut: string;
}[]) {
  try {
    const { data, error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' }).select();
    if (!error && data) return data;
  } catch (e) {
    console.warn('Mutation fallback upsertAttendance:', e);
  }
  records.forEach(r => {
    const existingIdx = MOCK_ATTENDANCE.findIndex(a => a.student_id === r.student_id && a.date === r.date);
    if (existingIdx !== -1) {
      MOCK_ATTENDANCE[existingIdx] = { ...MOCK_ATTENDANCE[existingIdx], ...r };
    } else {
      MOCK_ATTENDANCE.push({ id: 'att-' + Date.now() + Math.random(), ...r });
    }
  });
  return records;
}

export async function upsertGrades(records: {
  school_id: string;
  assessment_id: string;
  student_id: string;
  note: number;
  statut_validation: string;
}[]) {
  try {
    const { data, error } = await supabase.from('grades').upsert(records, { onConflict: 'assessment_id,student_id' }).select();
    if (!error && data) return data;
  } catch (e) {
    console.warn('Mutation fallback upsertGrades:', e);
  }
  records.forEach(r => {
    const existingIdx = MOCK_GRADES.findIndex(g => g.assessment_id === r.assessment_id && g.student_id === r.student_id);
    if (existingIdx !== -1) {
      MOCK_GRADES[existingIdx] = { ...MOCK_GRADES[existingIdx], ...r };
    } else {
      MOCK_GRADES.push({ id: 'g-' + Date.now() + Math.random(), ...r });
    }
  });
  return records;
}

// ── Helpers ───────────────────────────────────────────────────

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
}
