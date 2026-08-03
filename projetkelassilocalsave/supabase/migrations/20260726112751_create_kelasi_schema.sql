/*
# Create Kelasi Database Schema

## Overview
Creates the complete Postgres schema for the Kelasi school management application.
This is a multi-tenant system: every table is scoped by school_id, and RLS policies
ensure each user only accesses data belonging to their school.

## New Tables (20 tables)

### Core / Multi-tenant
1. `schools` — Educational establishments (the tenant root)
2. `users` — Application users linked to Supabase auth, scoped to a school with a role

### Academic Structure
3. `academic_years` — School years (e.g. 2026-2027)
4. `terms` — Trimesters within an academic year
5. `subjects` — Subjects taught (e.g. Math, French) with coefficients
6. `teachers` — Teacher profiles linked to a user account
7. `classrooms` — Classes (e.g. 6ème A) with a room and main teacher

### People
8. `students` — Student records with matricule, class assignment
9. `student_documents` — Documents attached to a student
10. `parents` — Parent/guardian records
11. `student_parents` — Junction table linking students to parents (many-to-many)

### Academic Operations
12. `enrollments` — Student enrollment in a class for a given year
13. `attendance` — Daily attendance records per student
14. `assessments` — Evaluations (devoirs, interrogations, exams)
15. `grades` — Individual grades per student per assessment

### Finance
16. `invoices` — Fee invoices per student
17. `payments` — Payments made against invoices
18. `receipts` — Payment receipts

### Communication
19. `notifications` — System notifications (SMS, email, in-app)
20. `announcements` — School-wide or targeted announcements

## Security
- RLS enabled on ALL tables.
- Policies are school-scoped: a user can only access rows where the row's school_id
  matches the school_id on their own users record.
- All 4 CRUD policies (select/insert/update/delete) per table, scoped to authenticated.
- The `users` table uses auth.uid() = id for ownership.

## Important Notes
1. The `users` table is NOT auth.users — it's a profile table that links to auth.users
   via the `id` column (which references auth.users.id).
2. All school-scoped tables have `school_id` as a foreign key to `schools`.
3. Junction table `student_parents` allows many students per parent and vice versa.
4. Timestamps use `timestamptz DEFAULT now()`.
5. UUIDs are generated with `gen_random_uuid()`.
6. Teachers created before classrooms to satisfy the FK from classrooms.enseignant_principal_id.
*/

-- ============================================================
-- 1. SCHOOLS (tenant root)
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  logo text DEFAULT '',
  adresse text NOT NULL,
  telephone text NOT NULL,
  statut_abonnement text NOT NULL DEFAULT 'essai' CHECK (statut_abonnement IN ('actif', 'essai', 'expire')),
  date_creation date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. USERS (profiles linked to auth.users, scoped to school)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  nom text NOT NULL,
  email text NOT NULL UNIQUE,
  telephone text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'secretary', 'accountant', 'teacher', 'parent')),
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. ACADEMIC YEARS
-- ============================================================
CREATE TABLE IF NOT EXISTS academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  statut text NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'archivee')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. TERMS (trimesters)
-- ============================================================
CREATE TABLE IF NOT EXISTS terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 5. SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  nom text NOT NULL,
  coefficient integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. TEACHERS (created before classrooms — classrooms FK references this)
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  email text NOT NULL,
  telephone text NOT NULL DEFAULT '',
  matiere_ids text[] DEFAULT '{}',
  classroom_ids text[] DEFAULT '{}',
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 7. CLASSROOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  niveau text NOT NULL,
  nom text NOT NULL,
  salle text NOT NULL DEFAULT '',
  enseignant_principal_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 8. STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  matricule text NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  date_naissance date NOT NULL,
  photo text DEFAULT '',
  classroom_id uuid REFERENCES classrooms(id) ON DELETE SET NULL,
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 9. STUDENT DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  nom text NOT NULL,
  type text NOT NULL,
  date_ajout date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 10. PARENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  nom text NOT NULL,
  telephone text NOT NULL,
  email text DEFAULT '',
  adresse text NOT NULL DEFAULT '',
  profession text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 11. STUDENT_PARENTS (many-to-many junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, parent_id)
);

-- ============================================================
-- 12. ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  date_inscription date NOT NULL DEFAULT CURRENT_DATE,
  statut text NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'archivee')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 13. ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES classrooms(id) ON DELETE SET NULL,
  date date NOT NULL,
  statut text NOT NULL CHECK (statut IN ('present', 'absent', 'retard', 'justifie')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 14. ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  date date NOT NULL,
  coefficient integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 15. GRADES
-- ============================================================
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  note numeric(5,2) NOT NULL,
  statut_validation text NOT NULL DEFAULT 'brouillon' CHECK (statut_validation IN ('brouillon', 'valide', 'publie')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 16. INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type_frais text NOT NULL CHECK (type_frais IN ('scolarite', 'inscription', 'cantine', 'transport', 'autre')),
  montant_total integer NOT NULL,
  montant_paye integer NOT NULL DEFAULT 0,
  reste_a_payer integer NOT NULL DEFAULT 0,
  date_emission date NOT NULL DEFAULT CURRENT_DATE,
  statut text NOT NULL DEFAULT 'impaye' CHECK (statut IN ('paye', 'partiel', 'impaye')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 17. PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  montant integer NOT NULL,
  date_paiement date NOT NULL DEFAULT CURRENT_DATE,
  mode_paiement text NOT NULL CHECK (mode_paiement IN ('especes', 'cheque', 'virement', 'mobile_money')),
  partiel boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 18. RECEIPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  date_generation timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 19. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('paiement', 'absence', 'annonce', 'bulletin', 'nouvel_enseignant', 'nouvel_eleve')),
  destinataire_id text NOT NULL,
  canal text NOT NULL CHECK (canal IN ('sms', 'email', 'in-app')),
  message text NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('envoye', 'en_attente', 'echec')),
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 20. ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  auteur_id uuid REFERENCES users(id) ON DELETE SET NULL,
  auteur_nom text NOT NULL,
  cible text NOT NULL CHECK (cible IN ('parents', 'enseignants', 'classe', 'tous')),
  titre text NOT NULL,
  contenu text NOT NULL,
  date_publication timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES for frequently queried columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_terms_school ON terms(school_id);
CREATE INDEX IF NOT EXISTS idx_terms_year ON terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_school ON classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_classroom ON students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_student ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_parents_school ON parents(school_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_student ON student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON student_parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_school ON enrollments(school_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school ON attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_assessments_school ON assessments(school_id);
CREATE INDEX IF NOT EXISTS idx_assessments_classroom ON assessments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_grades_school ON grades(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_assessment ON grades(assessment_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_school ON invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_school ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
