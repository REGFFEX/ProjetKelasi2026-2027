'use client';

import { ReactNode } from 'react';
import { AppProvider, useApp } from '@/lib/app-context';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { RouteGuard } from '@/components/route-guard';
import { cn } from '@/lib/utils';

function AppLayoutContent({ children }: { children: ReactNode }) {
  const { desktopCollapsed } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn('transition-all duration-300 ease-in-out', desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <Header />
        <main className="p-4 lg:p-6 max-w-[1400px] mx-auto pb-24 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RouteGuard>
      <AppProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </AppProvider>
    </RouteGuard>
  );
}
