'use client';

import { AppShell } from '@/components/app-shell';
import { DashboardContent } from './dashboard-content';

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
