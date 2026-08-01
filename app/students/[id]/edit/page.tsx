'use client';

import { AppShell } from '@/components/app-shell';
import { StudentFormContent } from '@/components/student-form-content';

export default function EditStudentPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <StudentFormContent mode="edit" studentId={params.id} />
    </AppShell>
  );
}
