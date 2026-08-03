'use client';

import { AppShell } from '@/components/app-shell';
import { StudentFormContent } from '@/components/student-form-content';

export default function NewStudentPage() {
  return (
    <AppShell>
      <StudentFormContent mode="create" />
    </AppShell>
  );
}
