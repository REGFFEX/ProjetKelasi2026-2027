'use client';

import { AppShell } from '@/components/app-shell';
import { ParentOverviewContent } from './parent-content';

export default function ParentPortalPage() {
  return (
    <AppShell>
      <ParentOverviewContent />
    </AppShell>
  );
}
