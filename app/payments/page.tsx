'use client';

import { AppShell } from '@/components/app-shell';
import { PaymentsContent } from './payments-content';

export default function PaymentsPage() {
  return (
    <AppShell>
      <PaymentsContent />
    </AppShell>
  );
}
