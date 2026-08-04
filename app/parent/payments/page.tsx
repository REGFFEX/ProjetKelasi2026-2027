'use client';

import { AppShell } from '@/components/app-shell';
import { ParentSectionContent } from '../parent-content';
import { Wallet, ReceiptText } from 'lucide-react';

export default function ParentPaymentsPage() {
  return (
    <AppShell>
      <ParentSectionContent
        title="Paiements"
        description="Consultez le suivi des paiements, des factures et des soldes de votre compte."
        badge="Finances"
        items={[
          {
            title: 'Solde actuel',
            description: 'Votre compte est à jour pour cette période.',
            href: '/payments',
            icon: Wallet,
          },
          {
            title: 'Dernière facture',
            description: 'Facture de scolarité disponible pour consultation.',
            href: '/payments',
            icon: ReceiptText,
          },
        ]}
      />
    </AppShell>
  );
}
