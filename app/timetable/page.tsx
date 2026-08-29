'use client';

import { AppShell } from '@/components/app-shell';
import { TimetableContent } from './timetable-content';

export default function TimetablePage() {
  return (
    <AppShell>
      <TimetableContent />
    </AppShell>
  );
}
