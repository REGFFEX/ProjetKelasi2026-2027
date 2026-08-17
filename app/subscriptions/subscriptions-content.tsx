'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { fetchAllSchoolsAdmin, updateSchoolAdmin } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig = {
  actif: { label: 'Actif', color: 'text-success bg-success/10', icon: CheckCircle2 },
  essai: { label: 'Essai', color: 'text-warning bg-warning/10', icon: Clock },
  expire: { label: 'Expiré', color: 'text-destructive bg-destructive/10', icon: XCircle },
};

export function SubscriptionsContent() {
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<Awaited<ReturnType<typeof fetchAllSchoolsAdmin>>>([]);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllSchoolsAdmin()
      .then(rows => { if (!cancelled) setSchools(rows); })
      .catch(e => console.error('Failed to load subscriptions:', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleRenew = async (id: string) => {
    setUpdatingId(id);
    setError('');
    try {
      const updated = await updateSchoolAdmin(id, { statut_abonnement: 'actif' });
      setSchools(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec du renouvellement.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const counts = {
    actif: schools.filter(s => s.statut_abonnement === 'actif').length,
    essai: schools.filter(s => s.statut_abonnement === 'essai').length,
    expire: schools.filter(s => s.statut_abonnement === 'expire').length,
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Abonnements</h1>
        <p className="text-muted-foreground mt-1">Suivi des licences par établissement</p>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {(['actif', 'essai', 'expire'] as const).map(statut => {
          const cfg = statusConfig[statut];
          const Icon = cfg.icon;
          return (
            <Card key={statut} className="p-4 rounded-2xl shadow-card text-center">
              <div className={cn('mx-auto flex h-9 w-9 items-center justify-center rounded-xl mb-2', cfg.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold text-foreground">{counts[statut]}</p>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden rounded-2xl shadow-card">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">École</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Créée le</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Statut</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schools.map(s => {
                const cfg = statusConfig[s.statut_abonnement];
                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-info/10">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{s.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(s.date_creation).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={cn('badge-modern', cfg.color)}>{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.statut_abonnement !== 'actif' && (
                        <button
                          onClick={() => handleRenew(s.id)}
                          disabled={updatingId === s.id}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                        >
                          {updatingId === s.id ? 'Renouvellement...' : 'Activer'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
