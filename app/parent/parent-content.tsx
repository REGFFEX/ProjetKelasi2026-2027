'use client';

import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { ArrowRight, FileText, GraduationCap, MessageSquare, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ParentSectionCard {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

interface ParentSectionProps {
  title: string;
  description: string;
  badge: string;
  items: ParentSectionCard[];
}

export function ParentSectionContent({ title, description, badge, items }: ParentSectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-sm">
        <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {badge}
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ParentOverviewContent() {
  return (
    <ParentSectionContent
      title="Espace parent"
      description="Consultez l’état de vos enfants, les paiements et les dernières informations partagées par l’établissement."
      badge="Bienvenue"
      items={[
        {
          title: 'Mes enfants',
          description: 'Consultez les informations de vos enfants et leurs classes.',
          href: '/parent/students',
          icon: GraduationCap,
        },
        {
          title: 'Paiements',
          description: 'Suivez les paiements, factures et soldes à jour.',
          href: '/parent/payments',
          icon: Wallet,
        },
        {
          title: 'Bulletins',
          description: 'Accédez aux derniers bulletins et appréciations.',
          href: '/parent/bulletins',
          icon: FileText,
        },
        {
          title: 'Annonces',
          description: 'Retrouvez les messages et annonces de l’école.',
          href: '/communication',
          icon: MessageSquare,
        },
      ]}
    />
  );
}
