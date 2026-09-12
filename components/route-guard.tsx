'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getDefaultRouteForRole } from '@/lib/navigation';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/lib/types';

const roleAccess: Record<Role, string[]> = {
  super_admin: ['/schools', '/subscriptions', '/super-admins'],
  school_admin: ['/dashboard', '/students', '/parents', '/teachers', '/classes', '/timetable', '/attendance', '/grades', '/payments', '/hours', '/communication', '/reports', '/settings'],
  secretary: ['/dashboard', '/students', '/parents', '/teachers', '/classes', '/timetable', '/attendance', '/communication', '/settings'],
  accountant: ['/dashboard', '/payments', '/students', '/hours', '/reports'],
  teacher: ['/dashboard', '/classes', '/students', '/timetable', '/attendance', '/grades', '/communication'],
  parent: ['/parent', '/communication'],
};

function isAllowedPath(role: Role, currentPath: string): boolean {
  const allowed = roleAccess[role] ?? [];
  return allowed.some(p => currentPath === p || currentPath.startsWith(p + '/') || currentPath.startsWith(p));
}

export function RouteGuard({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? '/';

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace('/');
      return;
    }
    const home = getDefaultRouteForRole(profile.role);
    if (!isAllowedPath(profile.role, currentPath) && currentPath !== home) {
      router.replace(home);
    }
  }, [profile, loading, currentPath, router]);

  // A role landing on a route it isn't allowed to see (stale bookmark, typed URL,
  // browser back button) must never get a render frame of that page's data before
  // the effect above redirects it away — so the guard withholds children here too,
  // not just in the effect.
  const blocked = !loading && profile && !isAllowedPath(profile.role, currentPath) && currentPath !== getDefaultRouteForRole(profile.role);

  if (loading || !profile || blocked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
