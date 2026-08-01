'use client';

import { AppShell } from '@/components/app-shell';
import { AttendanceContent } from './attendance-content';

export default function AttendancePage() {
  return (
    <AppShell>
      <AttendanceContent />
    </AppShell>
  );
}
