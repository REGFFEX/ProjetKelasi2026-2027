'use client';

import { Menu, Bell, Search, X, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { useAuth } from '@/lib/auth-context';
import { roleLabels } from '@/lib/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { fetchNotifications } from '@/lib/api';

interface NotifRow {
  id: string;
  message: string;
  statut: string;
  type: string;
  date: string;
}

export function Header() {
  const { toggleSidebar, mobileOpen, role } = useApp();
  const { profile } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifRow[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const loadNotifs = useCallback(async () => {
    if (!notifOpen) return;
    setLoadingNotifs(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data.slice(0, 6));
    } catch { /* ignore */ }
    finally { setLoadingNotifs(false); }
  }, [notifOpen]);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  const userInitials = (profile?.nom ?? '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 backdrop-blur-md px-4 lg:px-6 shadow-sm">
        {/* Universal 3-Bar Toggle Button (Mobile & Desktop) */}
        <button
          className="p-2 -ml-1 text-foreground rounded-xl hover:bg-muted/70 active:scale-95 transition-all flex items-center justify-center"
          onClick={toggleSidebar}
          title={mobileOpen ? 'Fermer le menu' : 'Menu principal'}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5 text-primary" /> : <Menu className="h-5 w-5 text-foreground" />}
        </button>

        <div className="lg:hidden flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{profile?.nom ?? 'Kelasi'}</p>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un élève, une classe..."
              className="w-full rounded-xl border border-input bg-muted/30 pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {roleLabels[role]}
          </span>

          <div className="relative">
            <button
              className="relative p-2 rounded-xl hover:bg-muted/50 transition-colors"
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <Bell className="h-5 w-5 text-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover shadow-xl animate-scale-in overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <p className="font-semibold text-sm">Notifications</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {loadingNotifs ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Aucune notification</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="flex gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                          <span className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0',
                            n.type === 'paiement' ? 'bg-success' :
                            n.type === 'absence' ? 'bg-destructive' :
                            n.type === 'annonce' ? 'bg-warning' : 'bg-info'
                          )} />
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate-2">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.date).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Link href="/communication" onClick={() => setNotifOpen(false)} className="block p-3 text-center text-sm text-primary hover:bg-muted/50 transition-colors">
                    Voir tout
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-info/15 text-primary text-sm font-semibold ring-2 ring-border/50 shrink-0">
            {userInitials}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={() => setSearchOpen(false)}>
          <div className="p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Rechercher..."
                  className="w-full rounded-xl border border-input bg-card pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>
              <button onClick={() => setSearchOpen(false)} className="p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
