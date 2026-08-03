// Kelasi — Domain Types (matching the data model spec)

export type Role =
  | 'super_admin'
  | 'school_admin'
  | 'secretary'
  | 'accountant'
  | 'teacher'
  | 'parent';

export interface User {
  id: string;
  schoolId: string | null;
  nom: string;
  email: string;
  password: string;
  telephone: string;
  role: Role;
  statut: 'actif' | 'inactif';
  avatarUrl?: string;
}

export interface School {
  id: string;
  nom: string;
  logo?: string;
  adresse: string;
  telephone: string;
  statutAbonnement: 'actif' | 'essai' | 'expire';
  dateCreation: string;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  libelle: string;
  dateDebut: string;
  dateFin: string;
  statut: 'active' | 'archivee';
}

export interface Term {
  id: string;
  schoolId: string;
  academicYearId: string;
  libelle: string;
  dateDebut: string;
  dateFin: string;
}

export interface Student {
  id: string;
  schoolId: string;
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  photo?: string;
  classroomId: string;
  statut: 'actif' | 'inactif';
  parentIds: string[];
  documents: StudentDocument[];
}

export interface StudentDocument {
  id: string;
  nom: string;
  type: string;
  dateAjout: string;
}

export interface Parent {
  id: string;
  schoolId: string;
  nom: string;
  telephone: string;
  email?: string;
  adresse: string;
  profession: string;
  studentIds: string[];
}

export interface Teacher {
  id: string;
  schoolId: string;
  userId: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  matiereIds: string[];
  classroomIds: string[];
  statut: 'actif' | 'inactif';
}

export interface Classroom {
  id: string;
  schoolId: string;
  niveau: string;
  nom: string;
  salle: string;
  enseignantPrincipalId: string | null;
  studentIds: string[];
}

export interface Subject {
  id: string;
  schoolId: string;
  nom: string;
  coefficient: number;
}

export interface Enrollment {
  id: string;
  schoolId: string;
  studentId: string;
  classroomId: string;
  academicYearId: string;
  dateInscription: string;
  statut: 'active' | 'archivee';
}

export type AttendanceStatus = 'present' | 'absent' | 'retard' | 'justifie';

export interface Attendance {
  id: string;
  schoolId: string;
  studentId: string;
  classroomId: string;
  date: string;
  statut: AttendanceStatus;
}

export interface Assessment {
  id: string;
  schoolId: string;
  subjectId: string;
  classroomId: string;
  termId: string;
  libelle: string;
  date: string;
  coefficient: number;
}

export type GradeStatus = 'brouillon' | 'valide' | 'publie';

export interface Grade {
  id: string;
  schoolId: string;
  assessmentId: string;
  studentId: string;
  note: number;
  statutValidation: GradeStatus;
}

export type FeeType = 'scolarite' | 'inscription' | 'cantine' | 'transport' | 'autre';

export interface Invoice {
  id: string;
  schoolId: string;
  studentId: string;
  typeFrais: FeeType;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
  dateEmission: string;
  statut: 'paye' | 'partiel' | 'impaye';
}

export type PaymentMethod = 'especes' | 'cheque' | 'virement' | 'mobile_money';

export interface Payment {
  id: string;
  schoolId: string;
  invoiceId: string;
  montant: number;
  datePaiement: string;
  modePaiement: PaymentMethod;
  partiel: boolean;
}

export interface Receipt {
  id: string;
  schoolId: string;
  paymentId: string;
  reference: string;
  dateGeneration: string;
}

export type NotificationType =
  | 'paiement'
  | 'absence'
  | 'annonce'
  | 'bulletin'
  | 'nouvel_enseignant'
  | 'nouvel_eleve';

export interface Notification {
  id: string;
  schoolId: string;
  type: NotificationType;
  destinataireId: string;
  canal: 'sms' | 'email' | 'in-app';
  message: string;
  statut: 'envoye' | 'en_attente' | 'echec';
  date: string;
}

export type AnnouncementTarget = 'parents' | 'enseignants' | 'classe' | 'tous';

export interface Announcement {
  id: string;
  schoolId: string;
  auteurId: string;
  auteurNom: string;
  cible: AnnouncementTarget;
  titre: string;
  contenu: string;
  datePublication: string;
}

export interface DashboardStats {
  effectifTotal: number;
  presentsAujourdhui: number;
  absentsAujourdhui: number;
  retardsAujourdhui: number;
  justifiesAujourdhui: number;
  paiementsDuJour: number;
  impayesTotal: number;
  nouveauxElevesMois: number;
  recettesMensuelles: number;
  recettesParMois: { mois: string; montant: number }[];
  presencesParClasse: { classe: string; present: number; absent: number; retard: number; justifie: number }[];
  repartitionEffectif: { niveau: string; effectif: number }[];
}
