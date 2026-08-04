'use client';

import { AppShell } from '@/components/app-shell';
import { ParentSectionContent } from '../parent-content';
import { GraduationCap, Users } from 'lucide-react';

export default function ParentStudentsPage() {
  return (
    <AppShell>
      <ParentSectionContent
        title="Mes enfants"
        description="Voici un aperçu des enfants associés à votre compte parent."
        badge="Parents"
        items={[
          {
            title: 'Élève 1',
            description: '6ème A · Présence correcte cette semaine.',
            href: '/dashboard',
            icon: GraduationCap,
          },
          {
            title: 'Élève 2',
            description: '4ème C · Dernier bulletin disponible.',
            href: '/parent/bulletins',
            icon: Users,
          },
        ]}
      />
    </AppShell>
  );
}
