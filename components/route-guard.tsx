'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/lib/types';

const roleAccess: Record<Role, string[]> = {
  super_admin: ['/dashboard', '/schools', '/subscriptions', '/settings'],
  school_admin: ['/dashboard', '/students', '/parents', '/teachers', '/classes', '/attendance', '/grades', '/payments', '/communication', '/reports', '/settings'],
  secretary: ['/dashboard', '/students', '/parents', '/classes', '/communication'],
  accountant: ['/dashboard', '/payments', '/students', '/reports'],
  teacher: ['/dashboard', '/classes', '/attendance', '/grades', '/communication'],
  parent: ['/dashboard', '/parent', '/communication'],
};

export function RouteGuard({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const currentPath = pathname ?? '/';

    if (loading) return;
    if (!session) {
      router.replace('/');
      return;
    }
    if (profile) {
      const allowed = roleAccess[profile.role] ?? [];
      const isAllowed = allowed.some(p => currentPath === p || currentPath.startsWith(p + '/') || currentPath.startsWith(p));
      if (!isAllowed && currentPath !== '/dashboard') {
        router.replace('/dashboard');
      }
    }
  }, [session, profile, loading, pathname, router]);

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
