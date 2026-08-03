'use client';

import { AppShell } from '@/components/app-shell';
import { StudentsListContent } from './students-list-content';

export default function StudentsPage() {
  return (
    <AppShell>
      <StudentsListContent />
    </AppShell>
  );
}
