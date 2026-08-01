'use client';

import { useState, useEffect } from 'react';
import { Plus, Bell, Megaphone, Send, CheckCircle, Clock, XCircle, Mail, MessageSquare, Smartphone, Loader2 } from 'lucide-react';
import { fetchAnnouncements, fetchNotifications } from '@/lib/api';
import type { AnnouncementTarget, NotificationType } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const targetLabels: Record<AnnouncementTarget, string> = {
  tous: 'Tous',
  parents: 'Parents',
  enseignants: 'Enseignants',
  classe: 'Classe spécifique',
};

const notifTypeConfig: Record<NotificationType, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  paiement: { label: 'Paiement', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  absence: { label: 'Absence', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  annonce: { label: 'Annonce', icon: Megaphone, color: 'text-warning', bg: 'bg-warning/10' },
  bulletin: { label: 'Bulletin', icon: Send, color: 'text-info', bg: 'bg-info/10' },
  nouvel_enseignant: { label: 'Nouvel enseignant', icon: Plus, color: 'text-primary', bg: 'bg-primary/10' },
  nouvel_eleve: { label: 'Nouvel élève', icon: Plus, color: 'text-primary', bg: 'bg-primary/10' },
};

const canalConfig = {
  sms: { label: 'SMS', icon: Smartphone },
  email: { label: 'Email', icon: Mail },
  'in-app': { label: 'In-app', icon: MessageSquare },
};

const statutConfig = {
  envoye: { label: 'Envoyé', icon: CheckCircle, color: 'text-success' },
  en_attente: { label: 'En attente', icon: Clock, color: 'text-warning' },
  echec: { label: 'Échec', icon: XCircle, color: 'text-destructive' },
};

type Tab = 'announcements' | 'notifications';

export function CommunicationContent() {
  const [tab, setTab] = useState<Tab>('announcements');
  const [showForm, setShowForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ titre: '', contenu: '', cible: 'tous' as AnnouncementTarget });

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Awaited<ReturnType<typeof fetchAnnouncements>>>([]);
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof fetchNotifications>>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, n] = await Promise.all([fetchAnnouncements(), fetchNotifications()]);
        if (cancelled) return;
        setAnnouncements(a);
        setNotifications(n);
      } catch (e) {
        console.error('Failed to load communication data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Communication</h1>
          <p className="text-muted-foreground mt-1 truncate">Annonces et notifications</p>
        </div>
        <Button className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle annonce</span>
        </Button>
      </div>

      {/* New announcement form */}
      {showForm && (
        <Card className="p-4 sm:p-5 rounded-2xl shadow-card animate-scale-in">
          <h3 className="font-semibold text-foreground mb-4">Nouvelle annonce</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="titre">Titre *</Label>
              <Input
                id="titre"
                value={newAnnouncement.titre}
                onChange={e => setNewAnnouncement({ ...newAnnouncement, titre: e.target.value })}
                placeholder="Titre de l'annonce"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contenu">Contenu *</Label>
              <textarea
                id="contenu"
                value={newAnnouncement.contenu}
                onChange={e => setNewAnnouncement({ ...newAnnouncement, contenu: e.target.value })}
                placeholder="Contenu de l'annonce..."
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <Label htmlFor="cible">Destinataires</Label>
              <select
                id="cible"
                value={newAnnouncement.cible}
                onChange={e => setNewAnnouncement({ ...newAnnouncement, cible: e.target.value as AnnouncementTarget })}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              >
                {Object.entries(targetLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" className="rounded-xl active:scale-[0.97] transition-transform" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform" onClick={() => setShowForm(false)}>
                <Send className="h-4 w-4" /> Publier
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTab('announcements')}
          className={cn(
            'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
            tab === 'announcements' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Megaphone className="h-4 w-4" /> Annonces ({announcements.length})
        </button>
        <button
          onClick={() => setTab('notifications')}
          className={cn(
            'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
            tab === 'notifications' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Bell className="h-4 w-4" /> Notifications ({notifications.length})
        </button>
      </div>

      {tab === 'announcements' && (
        <div className="space-y-3 sm:space-y-4">
          {announcements.map(a => (
            <Card key={a.id} className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 shrink-0">
                  <Megaphone className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{a.titre}</h3>
                    <Badge variant="secondary" className="shrink-0 badge-modern">{targetLabels[a.cible as AnnouncementTarget]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">{a.contenu}</p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="truncate">Par {a.auteur_nom}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline truncate">{new Date(a.date_publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="sm:hidden truncate">{new Date(a.date_publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-2 sm:space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
          {notifications.map(n => {
            const cfg = notifTypeConfig[n.type as NotificationType];
            const canal = canalConfig[n.canal as keyof typeof canalConfig];
            const statut = statutConfig[n.statut as keyof typeof statutConfig];
            const Icon = cfg.icon;
            const CanalIcon = canal.icon;
            const StatutIcon = statut.icon;
            return (
              <Card key={n.id} className="p-3 sm:p-4 rounded-xl shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl shrink-0', cfg.bg)}>
                    <Icon className={cn('h-4 w-4', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground line-clamp-2">{n.message}</p>
                      <span className={cn('flex items-center gap-1 text-xs font-medium shrink-0', statut.color)}>
                        <StatutIcon className="h-3 w-3" /> <span className="hidden sm:inline">{statut.label}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CanalIcon className="h-3 w-3" /> {canal.label}
                      </span>
                      <span>·</span>
                      <span className="truncate">{cfg.label}</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline truncate">{new Date(n.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="sm:hidden truncate">{new Date(n.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
