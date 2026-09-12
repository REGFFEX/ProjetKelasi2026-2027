'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { StudentsListContent } from './students-list-content';

export default function StudentsPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <StudentsListContent />
      </Suspense>
    </AppShell>
  );
}
