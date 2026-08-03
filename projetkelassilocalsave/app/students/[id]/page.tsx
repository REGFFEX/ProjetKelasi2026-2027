'use client';

import { AppShell } from '@/components/app-shell';
import { StudentDetailContent } from './student-detail-content';

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <StudentDetailContent studentId={params.id} />
    </AppShell>
  );
}
