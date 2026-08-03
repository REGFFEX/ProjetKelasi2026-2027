'use client';

import { useState, useEffect } from 'react';
import { School, Users, Calendar, Save, Upload, Shield, UserCog, Calculator, BookOpen, Mail, Lock, Bell, Loader2 } from 'lucide-react';
import { fetchSchools, fetchUsers, fetchAcademicYears } from '@/lib/api';
import { roleLabels } from '@/lib/navigation';
import type { Role } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tab = 'school' | 'users' | 'years' | 'security';

const tabs = [
  { id: 'school' as Tab, label: 'Établissement', icon: School },
  { id: 'users' as Tab, label: 'Utilisateurs', icon: Users },
  { id: 'years' as Tab, label: 'Années scolaires', icon: Calendar },
  { id: 'security' as Tab, label: 'Sécurité', icon: Shield },
];

const roleIcons: Record<Role, typeof Shield> = {
  super_admin: Shield,
  school_admin: UserCog,
  secretary: Users,
  accountant: Calculator,
  teacher: BookOpen,
  parent: Users,
};

export function SettingsContent() {
  const [tab, setTab] = useState<Tab>('school');
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<Awaited<ReturnType<typeof fetchSchools>>>([]);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof fetchUsers>>>([]);
  const [academicYears, setAcademicYears] = useState<Awaited<ReturnType<typeof fetchAcademicYears>>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, u, y] = await Promise.all([fetchSchools(), fetchUsers(), fetchAcademicYears()]);
        if (cancelled) return;
        setSchools(s);
        setUsers(u as { id: string; school_id: string; nom: string; email: string; telephone: string; role: Role; statut: string }[]);
        setAcademicYears(y);
      } catch (e) {
        console.error('Failed to load settings data:', e);
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

  const school = schools[0];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1 truncate">Configuration de l'établissement et des utilisateurs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'school' && school && (
        <Card className="p-4 sm:p-5 max-w-2xl rounded-2xl shadow-card">
          <h3 className="font-semibold text-foreground mb-4">Informations de l'établissement</h3>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-3xl shrink-0">
              {school.nom[0]}
            </div>
            <div className="min-w-0">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
                <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Changer le logo</span>
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5 truncate">JPG, PNG max 1MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="nom">Nom de l'établissement</Label>
              <Input id="nom" defaultValue={school.nom} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" defaultValue={school.telephone} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" defaultValue={school.adresse} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="abonnement">Abonnement</Label>
              <div className="mt-1.5">
                <Badge className={cn('badge-modern',
                  school.statut_abonnement === 'actif' ? 'bg-success/10 text-success' :
                  school.statut_abonnement === 'essai' ? 'bg-warning/10 text-warning' :
                  'bg-destructive/10 text-destructive'
                )}>
                  {school.statut_abonnement === 'actif' ? 'Actif' : school.statut_abonnement === 'essai' ? 'Essai' : 'Expiré'}
                </Badge>
              </div>
            </div>
            <div>
              <Label htmlFor="dateCreation">Date de création</Label>
              <Input id="dateCreation" defaultValue={new Date(school.date_creation).toLocaleDateString('fr-FR')} disabled className="mt-1.5" />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
              <Save className="h-4 w-4" /> <span className="hidden sm:inline">Enregistrer</span>
            </Button>
          </div>
        </Card>
      )}

      {tab === 'users' && (
        <Card className="overflow-hidden rounded-2xl shadow-card">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate">Utilisateurs et permissions</h3>
            <Button size="sm" className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0">
              <Users className="h-4 w-4" /> <span className="hidden sm:inline">Inviter</span>
            </Button>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Utilisateur</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Rôle</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => {
                  const RoleIcon = roleIcons[u.role as Role] || Users;
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                            {u.nom.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">{u.nom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[200px]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                          <RoleIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> <span className="truncate">{roleLabels[u.role as Role]}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('badge-modern inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          u.statut === 'actif' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        )}>
                          {u.statut === 'actif' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'years' && (
        <Card className="overflow-hidden rounded-2xl shadow-card">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate">Années scolaires</h3>
            <Button size="sm" className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0">
              <Calendar className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle année</span>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {academicYears.map(y => (
              <div key={y.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{y.libelle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {new Date(y.date_debut).toLocaleDateString('fr-FR')} → {new Date(y.date_fin).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Badge className={cn('badge-modern shrink-0', y.statut === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                  {y.statut === 'active' ? 'Active' : 'Archivée'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'security' && (
        <div className="max-w-2xl space-y-4 sm:space-y-6">
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0" /> <span className="truncate">Mot de passe</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-4 truncate">Modifiez votre mot de passe</p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPwd">Mot de passe actuel</Label>
                <Input id="currentPwd" type="password" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="newPwd">Nouveau mot de passe</Label>
                <Input id="newPwd" type="password" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="confirmPwd">Confirmer</Label>
                <Input id="confirmPwd" type="password" className="mt-1.5" />
              </div>
              <Button className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
                <Save className="h-4 w-4" /> <span className="hidden sm:inline">Mettre à jour</span>
              </Button>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Bell className="h-4 w-4 shrink-0" /> <span className="truncate">Notifications</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-4 truncate">Préférences de notification</p>
            <div className="space-y-3">
              {[
                { label: 'Notifications par email', desc: 'Recevoir les notifications par email' },
                { label: 'Notifications par SMS', desc: 'Recevoir les notifications par SMS' },
                { label: 'Alertes de paiement', desc: 'Être notifié des nouveaux paiements' },
                { label: 'Alertes d\'absence', desc: 'Être notifié des absences' },
              ].map((s, i) => (
                <label key={i} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors cursor-pointer gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
                  </div>
                  <input type="checkbox" defaultChecked={i < 2} className="rounded border-input h-4 w-4 shrink-0" />
                </label>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
