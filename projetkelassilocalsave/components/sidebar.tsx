'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { useAuth } from '@/lib/auth-context';
import { navItemsByRole, roleLabels } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { fetchSchools } from '@/lib/api';

interface SchoolOption { id: string; nom: string; }

export function Sidebar() {
  const {
    role,
    schoolId,
    mobileOpen,
    setMobileOpen,
    desktopCollapsed,
    setDesktopCollapsed,
    sidebarHovered,
    setSidebarHovered,
  } = useApp();
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const currentPath = pathname ?? '/';
  const items = navItemsByRole[role] ?? navItemsByRole.parent;
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  useEffect(() => {
    fetchSchools().then(s => setSchools(s.map(x => ({ id: x.id, nom: x.nom })))).catch(() => {});
  }, []);

  const userInitials = (profile?.nom ?? '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isExpandedDesktop = !desktopCollapsed || sidebarHovered;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none',
          // Mobile state
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0',
          // Desktop state
          isExpandedDesktop ? 'lg:w-64' : 'lg:w-20'
        )}
      >
        {/* Brand & Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-4 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0" onClick={() => setMobileOpen(false)}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20 shrink-0">
              K
            </div>
            <div
              className={cn(
                'transition-opacity duration-200 min-w-0',
                mobileOpen || isExpandedDesktop ? 'opacity-100 block' : 'opacity-0 hidden lg:hidden'
              )}
            >
              <p className="font-bold text-white text-base leading-tight tracking-tight">Kelasi</p>
              <p className="text-[11px] text-sidebar-foreground/60 font-medium truncate">Gestion Scolaire</p>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-sidebar-foreground/70 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(false)}
            title="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setDesktopCollapsed(prev => !prev)}
            title={desktopCollapsed ? 'Agrandir la barre d\'outils' : 'Réduire la barre d\'outils'}
          >
            {desktopCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        {/* School switcher */}
        {role !== 'super_admin' && schools.length > 0 && (
          <div className="border-b border-white/[0.08] px-3.5 py-3 shrink-0">
            {(mobileOpen || isExpandedDesktop) ? (
              <div>
                <label className="text-[10px] text-sidebar-foreground/50 mb-1 block uppercase tracking-wider font-semibold">
                  Établissement
                </label>
                <p className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white truncate">
                  {schools.find(s => s.id === schoolId)?.nom ?? schools[0]?.nom ?? '—'}
                </p>
              </div>
            ) : (
              <div
                className="flex items-center justify-center h-9 rounded-xl border border-white/10 bg-white/[0.06] text-white text-xs font-bold"
                title={schools.find(s => s.id === schoolId)?.nom ?? schools[0]?.nom ?? 'Établissement'}
              >
                {(schools.find(s => s.id === schoolId)?.nom ?? schools[0]?.nom ?? 'E')[0]}
              </div>
            )}
          </div>
        )}

        {/* Navigation list - Scrollable on both Desktop and Mobile */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 custom-scrollbar">
          {items.map(item => {
            const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[item.icon] || Icons.Circle;
            const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/25'
                    : 'text-sidebar-foreground/75 hover:bg-white/[0.08] hover:text-white',
                  !(mobileOpen || isExpandedDesktop) && 'lg:justify-center lg:px-0'
                )}
                title={item.label}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    'truncate transition-all duration-200',
                    mobileOpen || isExpandedDesktop ? 'inline-block' : 'hidden lg:hidden'
                  )}
                >
                  {item.label}
                </span>
                {isActive && (mobileOpen || isExpandedDesktop) && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-white shadow-sm" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile section */}
        <div className="border-t border-white/[0.08] px-3.5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-info/30 text-primary text-xs font-bold shrink-0 ring-2 ring-white/10 shadow-sm">
              {userInitials}
            </div>
            {(mobileOpen || isExpandedDesktop) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{profile?.nom ?? 'Utilisateur'}</p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate">{roleLabels[role]}</p>
              </div>
            )}
            {(mobileOpen || isExpandedDesktop) && (
              <button
                onClick={() => signOut()}
                className="text-sidebar-foreground/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile bottom quick nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-md px-2 py-2 lg:hidden safe-area-inset-bottom shadow-lg">
        {items.slice(0, 5).map(item => {
          const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[item.icon] || Icons.Circle;
          const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-all',
                isActive ? 'text-primary font-bold scale-105' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
