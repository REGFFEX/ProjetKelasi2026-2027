'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, Loader2, Monitor, Power } from 'lucide-react';

import { ApiError, apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DesktopDevice {
  id: string;
  nom: string;
  code_poste: string;
  created_at: string;
  last_seen_at: string | null;
  revoked: boolean;
}

/** Address the desktop application must use to reach this API. */
function serverAddress(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  if (base.startsWith('http')) return base;
  return typeof window === 'undefined' ? base : `${window.location.origin}${base}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Jamais';
  // The API stores naive UTC datetimes.
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Linking of the Kelasi desktop application: a school admin generates a link
 * code, types it once on each computer, and can revoke a computer later.
 */
export function DesktopSyncTab() {
  const [devices, setDevices] = useState<DesktopDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    try {
      setDevices(await apiGet<DesktopDevice[]>('/desktop-sync/devices'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      setCode(await apiPost<{ code: string; expires_at: string }>('/desktop-sync/codes'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de créer le code.');
    } finally {
      setGenerating(false);
    }
  };

  const revoke = async (device: DesktopDevice) => {
    if (!window.confirm(`Révoquer le poste « ${device.nom} » ? Il ne pourra plus synchroniser.`)) return;
    setRevokingId(device.id);
    try {
      await apiDelete(`/desktop-sync/devices/${device.id}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de révoquer ce poste.');
    } finally {
      setRevokingId(null);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-6">
      <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
        <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <KeyRound className="h-4 w-4 shrink-0" /> Lier un poste de l&apos;application desktop
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Les ordinateurs de l&apos;école qui utilisent Kelasi Desktop partagent leurs données grâce à la
          synchronisation. Sur chaque poste, ouvrez <strong>Administration → Établissement → Synchronisation</strong>,
          puis saisissez l&apos;adresse du serveur et un code de liaison (valable 7 jours, utilisable sur plusieurs postes).
        </p>
        <div className="rounded-xl border border-border p-3 mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Adresse du serveur</p>
            <p className="font-mono text-sm truncate">{serverAddress()}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => copy(serverAddress())}>
            <Copy className="h-3.5 w-3.5" /> {copied === serverAddress() ? 'Copié' : 'Copier'}
          </Button>
        </div>
        {code ? (
          <div className="rounded-xl bg-primary/5 border border-primary/30 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Code de liaison — affiché une seule fois</p>
              <p className="font-mono text-xl font-bold tracking-wider">{code.code}</p>
              <p className="text-xs text-muted-foreground">Expire le {formatDateTime(code.expires_at)}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => copy(code.code)}>
              <Copy className="h-3.5 w-3.5" /> {copied === code.code ? 'Copié' : 'Copier'}
            </Button>
          </div>
        ) : (
          <Button onClick={generate} disabled={generating} className="gap-1.5 rounded-xl">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Générer un code de liaison
          </Button>
        )}
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      </Card>

      <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Monitor className="h-4 w-4 shrink-0" /> Postes liés
        </h3>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun poste n&apos;est encore lié.</p>
        ) : (
          <div className="space-y-2">
            {devices.map(d => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {d.nom} <span className="text-muted-foreground">· {d.code_poste}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dernière synchronisation : {formatDateTime(d.last_seen_at)}
                  </p>
                </div>
                {d.revoked ? (
                  <Badge variant="secondary">Révoqué</Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive shrink-0"
                    disabled={revokingId === d.id}
                    onClick={() => revoke(d)}
                  >
                    <Power className="h-3.5 w-3.5" /> Révoquer
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
