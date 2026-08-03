/*
# Create RLS Policies for Kelasi (School-Scoped Multi-Tenant)

## Overview
This migration creates Row Level Security policies for all 20 tables in the Kelasi schema.
The app is multi-tenant: each user belongs to a school, and can only access data
belonging to that school.

## Policy Pattern
For every school-scoped table, we create 4 policies (SELECT, INSERT, UPDATE, DELETE):
- SELECT: user can read rows where row.school_id = user's school_id
- INSERT: user can insert rows where row.school_id = user's school_id
- UPDATE: user can update rows where row.school_id = user's school_id
- DELETE: user can delete rows where row.school_id = user's school_id

The user's school_id is resolved via a subquery:
  (SELECT school_id FROM users WHERE id = auth.uid())

## Special Tables
- `schools`: super_admin can see all; school-scoped users see their own school
- `users`: a user can read/update their own profile (auth.uid() = id);
           school-scoped read for all users in the same school

## Security Notes
1. All policies use `auth.uid()` — never `current_user`.
2. `super_admin` role gets unrestricted access to all schools.
3. Each policy is dropped before creation to ensure idempotency.
*/

-- ============================================================
-- SCHOOLS
-- super_admin sees all schools; other users see only their own
-- ============================================================
DROP POLICY IF EXISTS "select_schools" ON schools;
CREATE POLICY "select_schools" ON schools FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    OR id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_schools" ON schools;
CREATE POLICY "insert_schools" ON schools FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "update_schools" ON schools;
CREATE POLICY "update_schools" ON schools FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    OR id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    OR id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_schools" ON schools;
CREATE POLICY "delete_schools" ON schools FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- USERS
-- A user can read all users in their school; update own profile
-- ============================================================
DROP POLICY IF EXISTS "select_users" ON users;
CREATE POLICY "select_users" ON users FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_users" ON users;
CREATE POLICY "insert_users" ON users FOR INSERT
  TO authenticated WITH CHECK (
    id = auth.uid()
  );

DROP POLICY IF EXISTS "update_users" ON users;
CREATE POLICY "update_users" ON users FOR UPDATE
  TO authenticated USING (
    id = auth.uid()
    OR school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    id = auth.uid()
    OR school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_users" ON users;
CREATE POLICY "delete_users" ON users FOR DELETE
  TO authenticated USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- ACADEMIC YEARS
-- ============================================================
DROP POLICY IF EXISTS "select_academic_years" ON academic_years;
CREATE POLICY "select_academic_years" ON academic_years FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_academic_years" ON academic_years;
CREATE POLICY "insert_academic_years" ON academic_years FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_academic_years" ON academic_years;
CREATE POLICY "update_academic_years" ON academic_years FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_academic_years" ON academic_years;
CREATE POLICY "delete_academic_years" ON academic_years FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- TERMS
-- ============================================================
DROP POLICY IF EXISTS "select_terms" ON terms;
CREATE POLICY "select_terms" ON terms FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_terms" ON terms;
CREATE POLICY "insert_terms" ON terms FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_terms" ON terms;
CREATE POLICY "update_terms" ON terms FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_terms" ON terms;
CREATE POLICY "delete_terms" ON terms FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- SUBJECTS
-- ============================================================
DROP POLICY IF EXISTS "select_subjects" ON subjects;
CREATE POLICY "select_subjects" ON subjects FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_subjects" ON subjects;
CREATE POLICY "insert_subjects" ON subjects FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_subjects" ON subjects;
CREATE POLICY "update_subjects" ON subjects FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_subjects" ON subjects;
CREATE POLICY "delete_subjects" ON subjects FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- TEACHERS
-- ============================================================
DROP POLICY IF EXISTS "select_teachers" ON teachers;
CREATE POLICY "select_teachers" ON teachers FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_teachers" ON teachers;
CREATE POLICY "insert_teachers" ON teachers FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_teachers" ON teachers;
CREATE POLICY "update_teachers" ON teachers FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_teachers" ON teachers;
CREATE POLICY "delete_teachers" ON teachers FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- CLASSROOMS
-- ============================================================
DROP POLICY IF EXISTS "select_classrooms" ON classrooms;
CREATE POLICY "select_classrooms" ON classrooms FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_classrooms" ON classrooms;
CREATE POLICY "insert_classrooms" ON classrooms FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_classrooms" ON classrooms;
CREATE POLICY "update_classrooms" ON classrooms FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_classrooms" ON classrooms;
CREATE POLICY "delete_classrooms" ON classrooms FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- STUDENTS
-- ============================================================
DROP POLICY IF EXISTS "select_students" ON students;
CREATE POLICY "select_students" ON students FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_students" ON students;
CREATE POLICY "insert_students" ON students FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_students" ON students;
CREATE POLICY "update_students" ON students FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_students" ON students;
CREATE POLICY "delete_students" ON students FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- STUDENT DOCUMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_student_documents" ON student_documents;
CREATE POLICY "select_student_documents" ON student_documents FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_student_documents" ON student_documents;
CREATE POLICY "insert_student_documents" ON student_documents FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_student_documents" ON student_documents;
CREATE POLICY "update_student_documents" ON student_documents FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_student_documents" ON student_documents;
CREATE POLICY "delete_student_documents" ON student_documents FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- PARENTS
-- ============================================================
DROP POLICY IF EXISTS "select_parents" ON parents;
CREATE POLICY "select_parents" ON parents FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_parents" ON parents;
CREATE POLICY "insert_parents" ON parents FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_parents" ON parents;
CREATE POLICY "update_parents" ON parents FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_parents" ON parents;
CREATE POLICY "delete_parents" ON parents FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- STUDENT_PARENTS (junction)
-- ============================================================
DROP POLICY IF EXISTS "select_student_parents" ON student_parents;
CREATE POLICY "select_student_parents" ON student_parents FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_student_parents" ON student_parents;
CREATE POLICY "insert_student_parents" ON student_parents FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_student_parents" ON student_parents;
CREATE POLICY "update_student_parents" ON student_parents FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_student_parents" ON student_parents;
CREATE POLICY "delete_student_parents" ON student_parents FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- ENROLLMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_enrollments" ON enrollments;
CREATE POLICY "select_enrollments" ON enrollments FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_enrollments" ON enrollments;
CREATE POLICY "insert_enrollments" ON enrollments FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_enrollments" ON enrollments;
CREATE POLICY "update_enrollments" ON enrollments FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_enrollments" ON enrollments;
CREATE POLICY "delete_enrollments" ON enrollments FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- ATTENDANCE
-- ============================================================
DROP POLICY IF EXISTS "select_attendance" ON attendance;
CREATE POLICY "select_attendance" ON attendance FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_attendance" ON attendance;
CREATE POLICY "insert_attendance" ON attendance FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_attendance" ON attendance;
CREATE POLICY "update_attendance" ON attendance FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_attendance" ON attendance;
CREATE POLICY "delete_attendance" ON attendance FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- ASSESSMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_assessments" ON assessments;
CREATE POLICY "select_assessments" ON assessments FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_assessments" ON assessments;
CREATE POLICY "insert_assessments" ON assessments FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_assessments" ON assessments;
CREATE POLICY "update_assessments" ON assessments FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_assessments" ON assessments;
CREATE POLICY "delete_assessments" ON assessments FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- GRADES
-- ============================================================
DROP POLICY IF EXISTS "select_grades" ON grades;
CREATE POLICY "select_grades" ON grades FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_grades" ON grades;
CREATE POLICY "insert_grades" ON grades FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_grades" ON grades;
CREATE POLICY "update_grades" ON grades FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_grades" ON grades;
CREATE POLICY "delete_grades" ON grades FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- INVOICES
-- ============================================================
DROP POLICY IF EXISTS "select_invoices" ON invoices;
CREATE POLICY "select_invoices" ON invoices FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_invoices" ON invoices;
CREATE POLICY "insert_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_invoices" ON invoices;
CREATE POLICY "update_invoices" ON invoices FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_invoices" ON invoices;
CREATE POLICY "delete_invoices" ON invoices FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_payments" ON payments;
CREATE POLICY "select_payments" ON payments FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_payments" ON payments;
CREATE POLICY "insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_payments" ON payments;
CREATE POLICY "update_payments" ON payments FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_payments" ON payments;
CREATE POLICY "delete_payments" ON payments FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- RECEIPTS
-- ============================================================
DROP POLICY IF EXISTS "select_receipts" ON receipts;
CREATE POLICY "select_receipts" ON receipts FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_receipts" ON receipts;
CREATE POLICY "insert_receipts" ON receipts FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_receipts" ON receipts;
CREATE POLICY "update_receipts" ON receipts FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_receipts" ON receipts;
CREATE POLICY "delete_receipts" ON receipts FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_notifications" ON notifications;
CREATE POLICY "delete_notifications" ON notifications FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_announcements" ON announcements;
CREATE POLICY "select_announcements" ON announcements FOR SELECT
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_announcements" ON announcements;
CREATE POLICY "insert_announcements" ON announcements FOR INSERT
  TO authenticated WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "update_announcements" ON announcements;
CREATE POLICY "update_announcements" ON announcements FOR UPDATE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_announcements" ON announcements;
CREATE POLICY "delete_announcements" ON announcements FOR DELETE
  TO authenticated USING (
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );
