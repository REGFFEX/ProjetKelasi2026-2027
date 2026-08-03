'use client';

import { AppShell } from '@/components/app-shell';
import { SettingsContent } from './settings-content';

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}
