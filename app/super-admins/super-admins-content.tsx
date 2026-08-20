'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Loader2, Pencil, Power } from 'lucide-react';
import {
  fetchSuperAdmins,
  createSuperAdmin,
  updateSuperAdmin,
  resetSuperAdminPassword,
  type SuperAdminCreateInput,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const emptyCreateForm: SuperAdminCreateInput = { nom: '', email: '', password: '', telephone: '' };

export function SuperAdminsContent() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Awaited<ReturnType<typeof fetchSuperAdmins>>>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editingAdmin, setEditingAdmin] = useState<Awaited<ReturnType<typeof fetchSuperAdmins>>[number] | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchSuperAdmins()
      .then(rows => { if (!cancelled) setAdmins(rows); })
      .catch(e => console.error('Failed to load super admins:', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setCreateForm(emptyCreateForm);
    setCreateError('');
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nom.trim() || !createForm.email.trim() || createForm.password.length < 6) return;
    setSaving(true);
    setCreateError('');
    try {
      const created = await createSuperAdmin(createForm);
      setAdmins(prev => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)));
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Échec de la création.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (a: Awaited<ReturnType<typeof fetchSuperAdmins>>[number]) => {
    setEditingAdmin(a);
    setEditNom(a.nom);
    setEditTelephone(a.telephone);
    setEditPassword('');
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const updated = await updateSuperAdmin(editingAdmin.id, { nom: editNom, telephone: editTelephone });
      if (editPassword.trim()) await resetSuperAdminPassword(editingAdmin.id, editPassword.trim());
      setAdmins(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      setEditingAdmin(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Échec de la mise à jour.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatut = async (a: Awaited<ReturnType<typeof fetchSuperAdmins>>[number]) => {
    setTogglingId(a.id);
    setToggleError('');
    try {
      const updated = await updateSuperAdmin(a.id, { statut: a.statut === 'actif' ? 'inactif' : 'actif' });
      setAdmins(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setToggleError(err instanceof ApiError ? err.message : 'Échec de la mise à jour du statut.');
    } finally {
      setTogglingId(null);
    }
  };

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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Administrateurs plateforme</h1>
          <p className="text-muted-foreground mt-1">{admins.length} super admin(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvel administrateur</span>
        </Button>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouvel administrateur plateforme</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label htmlFor="sa-nom">Nom complet *</Label>
              <Input id="sa-nom" value={createForm.nom} onChange={e => setCreateForm({ ...createForm, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="sa-email">Email *</Label>
              <Input id="sa-email" type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="sa-password">Mot de passe *</Label>
              <Input id="sa-password" type="password" minLength={6} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="sa-telephone">Téléphone</Label>
              <Input id="sa-telephone" value={createForm.telephone} onChange={e => setCreateForm({ ...createForm, telephone: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            {createError && <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{createError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-1.5 rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAdmin} onOpenChange={open => !open && setEditingAdmin(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Modifier {editingAdmin?.nom}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div>
              <Label htmlFor="sa-e-nom">Nom complet</Label>
              <Input id="sa-e-nom" value={editNom} onChange={e => setEditNom(e.target.value)} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="sa-e-telephone">Téléphone</Label>
              <Input id="sa-e-telephone" value={editTelephone} onChange={e => setEditTelephone(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="sa-e-password">Nouveau mot de passe (optionnel)</Label>
              <Input id="sa-e-password" type="password" minLength={6} value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" className="mt-1.5 rounded-xl" />
            </div>
            {editError && <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{editError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={savingEdit} className="gap-1.5 rounded-xl">
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {toggleError && (
        <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">{toggleError}</div>
      )}

      <Card className="overflow-hidden rounded-2xl shadow-card">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Administrateur</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Email</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Statut</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admins.map(a => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">
                        {a.nom} {a.id === profile?.id && <span className="text-xs text-muted-foreground">(vous)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[220px]">{a.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('badge-modern inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      a.statut === 'actif' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    )}>
                      {a.statut === 'actif' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)} title="Modifier" className="h-7 w-7 p-0 rounded-lg active:scale-95 transition-transform">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" onClick={() => handleToggleStatut(a)} disabled={togglingId === a.id}
                        title={a.statut === 'actif' ? 'Désactiver' : 'Activer'}
                        className="h-7 w-7 p-0 rounded-lg active:scale-95 transition-transform"
                      >
                        {togglingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
