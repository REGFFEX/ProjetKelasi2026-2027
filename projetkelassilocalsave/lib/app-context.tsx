'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import type { Role } from './types';
import { useAuth } from './auth-context';

interface AppContextValue {
  role: Role;
  schoolId: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  desktopCollapsed: boolean;
  setDesktopCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  sidebarHovered: boolean;
  setSidebarHovered: (hovered: boolean) => void;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Role is locked from the auth profile — never client-side mutable
  const role = profile?.role ?? 'parent';
  const schoolId = profile?.school_id ?? '';

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileOpen(prev => !prev);
    } else {
      setDesktopCollapsed(prev => !prev);
    }
  };

  const value = useMemo(
    () => ({
      role,
      schoolId,
      mobileOpen,
      setMobileOpen,
      desktopCollapsed,
      setDesktopCollapsed,
      sidebarHovered,
      setSidebarHovered,
      toggleSidebar,
    }),
    [role, schoolId, mobileOpen, desktopCollapsed, sidebarHovered]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
