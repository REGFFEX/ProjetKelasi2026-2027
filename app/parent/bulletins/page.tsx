'use client';

import { AppShell } from '@/components/app-shell';
import { ParentSectionContent } from '../parent-content';
import { FileText, BookOpen } from 'lucide-react';

export default function ParentBulletinsPage() {
  return (
    <AppShell>
      <ParentSectionContent
        title="Bulletins"
        description="Retrouvez les derniers bulletins et appréciations envoyés par l’établissement."
        badge="Suivi"
        items={[
          {
            title: 'Bulletin du dernier trimestre',
            description: 'Disponible et prêt à être consulté.',
            href: '/reports',
            icon: FileText,
          },
          {
            title: 'Appréciations',
            description: 'Retrouvez les commentaires de l’équipe pédagogique.',
            href: '/reports',
            icon: BookOpen,
          },
        ]}
      />
    </AppShell>
  );
}
