'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Users, GraduationCap, Loader2, Pencil, UserPlus } from 'lucide-react';
import { fetchAllSchoolsAdmin, createSchoolAdmin, updateSchoolAdmin, createSchoolAdminUser } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const emptyForm = { nom: '', adresse: '', telephone: '', statut_abonnement: 'essai' as 'actif' | 'essai' | 'expire' };
const emptyAdminForm = { nom: '', email: '', password: '', telephone: '' };

const statusConfig = {
  actif: { label: 'Actif', color: 'bg-success/10 text-success' },
  essai: { label: 'Essai', color: 'bg-warning/10 text-warning' },
  expire: { label: 'Expiré', color: 'bg-destructive/10 text-destructive' },
};

export function SchoolsContent() {
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<Awaited<ReturnType<typeof fetchAllSchoolsAdmin>>>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [adminSchoolId, setAdminSchoolId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAllSchoolsAdmin()
      .then(rows => { if (!cancelled) setSchools(rows); })
      .catch(e => console.error('Failed to load schools:', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (s: Awaited<ReturnType<typeof fetchAllSchoolsAdmin>>[number]) => {
    setEditingId(s.id);
    setForm({ nom: s.nom, adresse: s.adresse, telephone: s.telephone, statut_abonnement: s.statut_abonnement });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const updated = await updateSchoolAdmin(editingId, form);
        setSchools(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createSchoolAdmin(form);
        setSchools(prev => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)));
      }
      setShowDialog(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const openAddAdmin = (schoolId: string) => {
    setAdminSchoolId(schoolId);
    setAdminForm(emptyAdminForm);
    setAdminError('');
    setAdminSuccess('');
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSchoolId || !adminForm.nom.trim() || !adminForm.email.trim() || adminForm.password.length < 6) return;
    setSavingAdmin(true);
    setAdminError('');
    try {
      await createSchoolAdminUser(adminSchoolId, adminForm);
      setSchools(prev => prev.map(s => (s.id === adminSchoolId ? { ...s, user_count: s.user_count + 1 } : s)));
      setAdminSuccess('Administrateur créé.');
      setAdminForm(emptyAdminForm);
    } catch (err) {
      setAdminError(err instanceof ApiError ? err.message : 'Échec de la création de l\'administrateur.');
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleStatusChange = async (id: string, statut: 'actif' | 'essai' | 'expire') => {
    setError('');
    try {
      const updated = await updateSchoolAdmin(id, { statut_abonnement: statut });
      setSchools(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de la mise à jour du statut.');
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Écoles</h1>
          <p className="text-muted-foreground mt-1">{schools.length} établissement(s) sur la plateforme</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle école</span>
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier l\'école' : 'Nouvelle école'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <Label htmlFor="s-nom">Nom *</Label>
              <Input id="s-nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="s-adresse">Adresse</Label>
              <Input id="s-adresse" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="s-tel">Téléphone</Label>
              <Input id="s-tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="s-statut">Abonnement</Label>
              <select
                id="s-statut"
                value={form.statut_abonnement}
                onChange={e => setForm({ ...form, statut_abonnement: e.target.value as 'actif' | 'essai' | 'expire' })}
                className="mt-1.5 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
              >
                <option value="essai">Essai</option>
                <option value="actif">Actif</option>
                <option value="expire">Expiré</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-1.5 rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editingId ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adminSchoolId} onOpenChange={open => !open && setAdminSchoolId(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Ce compte pourra ensuite créer et gérer tous les autres utilisateurs de son école.
          </p>
          <form onSubmit={handleCreateAdmin} className="space-y-3">
            <div>
              <Label htmlFor="a-nom">Nom complet *</Label>
              <Input id="a-nom" value={adminForm.nom} onChange={e => setAdminForm({ ...adminForm, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="a-email">Email *</Label>
              <Input id="a-email" type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="a-password">Mot de passe *</Label>
              <Input id="a-password" type="password" minLength={6} value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="a-telephone">Téléphone</Label>
              <Input id="a-telephone" value={adminForm.telephone} onChange={e => setAdminForm({ ...adminForm, telephone: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            {adminError && <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{adminError}</div>}
            {adminSuccess && <div className="rounded-xl bg-success/10 px-3 py-2.5 text-sm text-success">{adminSuccess}</div>}
            <DialogFooter>
              <Button type="submit" disabled={savingAdmin} className="gap-1.5 rounded-xl">
                {savingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {schools.map(s => {
          const cfg = statusConfig[s.statut_abonnement];
          return (
            <Card key={s.id} className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-info/10 text-primary shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="h-8 w-8 p-0 rounded-xl active:scale-95 transition-transform">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="font-semibold text-foreground truncate">{s.nom}</h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{s.adresse || 'Adresse non renseignée'}</p>

              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {s.student_count} élève(s)</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {s.user_count} utilisateur(s)</span>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2">
                <Badge className={cn('badge-modern', cfg.color)}>{cfg.label}</Badge>
                <select
                  value={s.statut_abonnement}
                  onChange={e => handleStatusChange(s.id, e.target.value as 'actif' | 'essai' | 'expire')}
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="essai">Essai</option>
                  <option value="actif">Actif</option>
                  <option value="expire">Expiré</option>
                </select>
              </div>
              <button
                onClick={() => openAddAdmin(s.id)}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-full"
              >
                <UserPlus className="h-3.5 w-3.5" /> Ajouter un administrateur
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
