'use client';

import { useState, useEffect } from 'react';
import { School, Users, Calendar, Save, Upload, Shield, UserCog, Calculator, BookOpen, Mail, Lock, Bell, Loader2, CheckCircle2, Layers, Plus, Pencil, Trash2, GraduationCap, Power } from 'lucide-react';
import {
  fetchMySchool,
  updateMySchool,
  fetchUsers,
  createUser,
  updateUser,
  resetUserPassword,
  type UserUpdateInput,
  fetchAcademicYears,
  createAcademicYear,
  activateAcademicYear,
  fetchCycles,
  createCycle,
  updateCycle,
  deleteCycle,
  fetchLevels,
  createLevel,
  updateLevel,
  deleteLevel,
} from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { roleLabels } from '@/lib/navigation';
import type { Role } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const emptyYearForm = { libelle: '', date_debut: '', date_fin: '', activate: false };
const emptyCycleForm = { nom: '', ordre: 0, evaluation_mode: 'notes' as 'notes' | 'qualitatif' };
const emptyLevelForm = { cycle_id: '', nom: '', ordre: 0 };
const emptyUserForm = { nom: '', email: '', password: '', telephone: '', role: 'secretary' as 'school_admin' | 'secretary' | 'accountant' | 'teacher' | 'parent' };
const creatableRoles: { value: 'school_admin' | 'secretary' | 'accountant' | 'teacher' | 'parent'; label: string }[] = [
  { value: 'school_admin', label: 'Directeur' },
  { value: 'secretary', label: 'Secrétariat' },
  { value: 'accountant', label: 'Comptable' },
  { value: 'teacher', label: 'Enseignant' },
  { value: 'parent', label: 'Parent' },
];
const editableRoles: { value: 'school_admin' | 'secretary' | 'accountant'; label: string }[] = [
  { value: 'school_admin', label: 'Directeur' },
  { value: 'secretary', label: 'Secrétariat' },
  { value: 'accountant', label: 'Comptable' },
];

type Tab = 'school' | 'hierarchy' | 'users' | 'years' | 'security';

const tabs = [
  { id: 'school' as Tab, label: 'Établissement', icon: School },
  { id: 'hierarchy' as Tab, label: 'Cycles & Niveaux', icon: Layers },
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
  const [school, setSchool] = useState<Awaited<ReturnType<typeof fetchMySchool>>>(null);
  const [schoolForm, setSchoolForm] = useState({ nom: '', adresse: '', telephone: '' });
  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolError, setSchoolError] = useState('');
  const [schoolSaved, setSchoolSaved] = useState(false);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof fetchUsers>>>([]);
  const [academicYears, setAcademicYears] = useState<Awaited<ReturnType<typeof fetchAcademicYears>>>([]);
  const [showYearDialog, setShowYearDialog] = useState(false);
  const [yearForm, setYearForm] = useState(emptyYearForm);
  const [savingYear, setSavingYear] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [yearError, setYearError] = useState('');

  const [cycles, setCycles] = useState<Awaited<ReturnType<typeof fetchCycles>>>([]);
  const [levels, setLevels] = useState<Awaited<ReturnType<typeof fetchLevels>>>([]);
  const [showCycleDialog, setShowCycleDialog] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [cycleForm, setCycleForm] = useState(emptyCycleForm);
  const [savingCycle, setSavingCycle] = useState(false);
  const [showLevelDialog, setShowLevelDialog] = useState(false);
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [levelForm, setLevelForm] = useState(emptyLevelForm);
  const [savingLevel, setSavingLevel] = useState(false);
  const [hierarchyError, setHierarchyError] = useState('');

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');
  const [editingUser, setEditingUser] = useState<Awaited<ReturnType<typeof fetchUsers>>[number] | null>(null);
  const [editRole, setEditRole] = useState<'school_admin' | 'secretary' | 'accountant'>('secretary');
  const [editStatut, setEditStatut] = useState<'actif' | 'inactif'>('actif');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, u, y, cyc, lvl] = await Promise.all([
          fetchMySchool(),
          fetchUsers(),
          fetchAcademicYears(),
          fetchCycles(),
          fetchLevels(),
        ]);
        if (cancelled) return;
        setSchool(s);
        if (s) setSchoolForm({ nom: s.nom, adresse: s.adresse, telephone: s.telephone });
        setUsers(u as { id: string; school_id: string; nom: string; email: string; telephone: string; role: Role; statut: string }[]);
        setAcademicYears(y);
        setCycles(cyc.sort((a, b) => a.ordre - b.ordre));
        setLevels(lvl.sort((a, b) => a.ordre - b.ordre));
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

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolForm.nom.trim()) return;
    setSavingSchool(true);
    setSchoolError('');
    setSchoolSaved(false);
    try {
      const updated = await updateMySchool(schoolForm);
      setSchool(updated);
      setSchoolSaved(true);
    } catch (err) {
      setSchoolError(err instanceof ApiError ? err.message : 'Échec de l\'enregistrement.');
    } finally {
      setSavingSchool(false);
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearForm.libelle.trim() || !yearForm.date_debut || !yearForm.date_fin) return;
    setSavingYear(true);
    setYearError('');
    try {
      const created = await createAcademicYear(yearForm);
      setAcademicYears(prev => {
        const updated = yearForm.activate ? prev.map(y => ({ ...y, statut: 'archivee' as const })) : prev;
        return [created, ...updated];
      });
      setYearForm(emptyYearForm);
      setShowYearDialog(false);
    } catch (err) {
      setYearError(err instanceof ApiError ? err.message : 'Échec de la création de l\'année scolaire.');
    } finally {
      setSavingYear(false);
    }
  };

  const handleActivateYear = async (id: string) => {
    setActivatingId(id);
    setYearError('');
    try {
      const activated = await activateAcademicYear(id);
      setAcademicYears(prev => prev.map(y => (y.id === activated.id ? activated : { ...y, statut: 'archivee' as const })));
    } catch (err) {
      setYearError(err instanceof ApiError ? err.message : 'Échec de l\'activation.');
    } finally {
      setActivatingId(null);
    }
  };

  const openCreateCycle = () => {
    setEditingCycleId(null);
    setCycleForm(emptyCycleForm);
    setShowCycleDialog(true);
  };

  const openEditCycle = (c: Awaited<ReturnType<typeof fetchCycles>>[number]) => {
    setEditingCycleId(c.id);
    setCycleForm({ nom: c.nom, ordre: c.ordre, evaluation_mode: c.evaluation_mode });
    setShowCycleDialog(true);
  };

  const handleSaveCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleForm.nom.trim()) return;
    setSavingCycle(true);
    setHierarchyError('');
    try {
      if (editingCycleId) {
        const updated = await updateCycle(editingCycleId, cycleForm);
        setCycles(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createCycle(cycleForm);
        setCycles(prev => [...prev, created].sort((a, b) => a.ordre - b.ordre));
      }
      setShowCycleDialog(false);
    } catch (err) {
      setHierarchyError(err instanceof ApiError ? err.message : 'Échec de l\'enregistrement du cycle.');
    } finally {
      setSavingCycle(false);
    }
  };

  const handleDeleteCycle = async (id: string) => {
    if (!window.confirm('Supprimer ce cycle ? Les niveaux qui en dépendent doivent être supprimés séparément.')) return;
    setHierarchyError('');
    try {
      await deleteCycle(id);
      setCycles(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setHierarchyError(err instanceof ApiError ? err.message : 'Échec de la suppression du cycle.');
    }
  };

  const openCreateLevel = (cycleId?: string) => {
    setEditingLevelId(null);
    setLevelForm({ ...emptyLevelForm, cycle_id: cycleId || cycles[0]?.id || '' });
    setShowLevelDialog(true);
  };

  const openEditLevel = (l: Awaited<ReturnType<typeof fetchLevels>>[number]) => {
    setEditingLevelId(l.id);
    setLevelForm({ cycle_id: l.cycle_id, nom: l.nom, ordre: l.ordre });
    setShowLevelDialog(true);
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm.nom.trim() || !levelForm.cycle_id) return;
    setSavingLevel(true);
    setHierarchyError('');
    try {
      if (editingLevelId) {
        const updated = await updateLevel(editingLevelId, levelForm);
        setLevels(prev => prev.map(l => (l.id === updated.id ? updated : l)));
      } else {
        const created = await createLevel(levelForm);
        setLevels(prev => [...prev, created].sort((a, b) => a.ordre - b.ordre));
      }
      setShowLevelDialog(false);
    } catch (err) {
      setHierarchyError(err instanceof ApiError ? err.message : 'Échec de l\'enregistrement du niveau.');
    } finally {
      setSavingLevel(false);
    }
  };

  const handleDeleteLevel = async (id: string) => {
    if (!window.confirm('Supprimer ce niveau ? Les classes qui en dépendent doivent être réaffectées séparément.')) return;
    setHierarchyError('');
    try {
      await deleteLevel(id);
      setLevels(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      setHierarchyError(err instanceof ApiError ? err.message : 'Échec de la suppression du niveau.');
    }
  };

  const openCreateUser = () => {
    setUserForm(emptyUserForm);
    setUserError('');
    setShowUserDialog(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.nom.trim() || !userForm.email.trim() || userForm.password.length < 6) return;
    setSavingUser(true);
    setUserError('');
    try {
      const created = await createUser(userForm);
      setUsers(prev => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)));
      setShowUserDialog(false);
    } catch (err) {
      setUserError(err instanceof ApiError ? err.message : 'Échec de la création de l\'utilisateur.');
    } finally {
      setSavingUser(false);
    }
  };

  const openEditUser = (u: Awaited<ReturnType<typeof fetchUsers>>[number]) => {
    setEditingUser(u);
    setEditRole((['school_admin', 'secretary', 'accountant'].includes(u.role) ? u.role : 'secretary') as 'school_admin' | 'secretary' | 'accountant');
    setEditStatut(u.statut as 'actif' | 'inactif');
    setEditPassword('');
    setEditError('');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const roleIsManagedHere = !['teacher', 'parent'].includes(editingUser.role);
      const updates: UserUpdateInput = { statut: editStatut };
      if (roleIsManagedHere) updates.role = editRole;
      const updated = await updateUser(editingUser.id, updates);
      if (editPassword.trim()) await resetUserPassword(editingUser.id, editPassword.trim());
      setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Échec de la mise à jour.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleUserStatut = async (u: Awaited<ReturnType<typeof fetchUsers>>[number]) => {
    setTogglingUserId(u.id);
    try {
      const updated = await updateUser(u.id, { statut: u.statut === 'actif' ? 'inactif' : 'actif' });
      setUsers(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    } finally {
      setTogglingUserId(null);
    }
  };

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

      {tab === 'school' && !school && (
        <Card className="p-4 sm:p-5 max-w-2xl rounded-2xl shadow-card">
          <p className="text-sm text-muted-foreground">Aucun établissement associé à ce compte.</p>
        </Card>
      )}

      {tab === 'school' && school && (
        <Card className="p-4 sm:p-5 max-w-2xl rounded-2xl shadow-card">
          <h3 className="font-semibold text-foreground mb-4">Informations de l'établissement</h3>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-3xl shrink-0">
              {schoolForm.nom[0] ?? school.nom[0]}
            </div>
            <div className="min-w-0">
              <Button variant="outline" size="sm" disabled title="Bientôt disponible" className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
                <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Changer le logo</span>
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5 truncate">JPG, PNG max 1MB</p>
            </div>
          </div>

          <form onSubmit={handleSaveSchool}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="nom">Nom de l'établissement</Label>
                <Input id="nom" value={schoolForm.nom} onChange={e => setSchoolForm({ ...schoolForm, nom: e.target.value })} required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" value={schoolForm.telephone} onChange={e => setSchoolForm({ ...schoolForm, telephone: e.target.value })} className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input id="adresse" value={schoolForm.adresse} onChange={e => setSchoolForm({ ...schoolForm, adresse: e.target.value })} className="mt-1.5" />
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

            {schoolError && (
              <div className="mt-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">{schoolError}</div>
            )}
            {schoolSaved && (
              <div className="mt-4 rounded-xl bg-success/10 px-3 py-2.5 text-sm text-success animate-fade-in flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Enregistré.
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={savingSchool} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
                {savingSchool ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="hidden sm:inline">Enregistrer</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'hierarchy' && (
        <>
          <Dialog open={showCycleDialog} onOpenChange={setShowCycleDialog}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingCycleId ? 'Modifier le cycle' : 'Nouveau cycle'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCycle} className="space-y-3">
                <div>
                  <Label htmlFor="cy-nom">Nom *</Label>
                  <Input id="cy-nom" placeholder="ex: Préscolaire" value={cycleForm.nom} onChange={e => setCycleForm({ ...cycleForm, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="cy-ordre">Ordre d'affichage</Label>
                  <Input id="cy-ordre" type="number" min={0} value={cycleForm.ordre} onChange={e => setCycleForm({ ...cycleForm, ordre: parseInt(e.target.value, 10) || 0 })} className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="cy-mode">Mode d'évaluation</Label>
                  <select
                    id="cy-mode"
                    value={cycleForm.evaluation_mode}
                    onChange={e => setCycleForm({ ...cycleForm, evaluation_mode: e.target.value as 'notes' | 'qualitatif' })}
                    className="mt-1.5 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                  >
                    <option value="notes">Notes chiffrées (/20)</option>
                    <option value="qualitatif">Appréciations qualitatives</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Le mode qualitatif remplace la saisie de notes par des appréciations libres (ex: préscolaire).</p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={savingCycle} className="gap-1.5 rounded-xl">
                    {savingCycle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingCycleId ? 'Enregistrer' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showLevelDialog} onOpenChange={setShowLevelDialog}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingLevelId ? 'Modifier le niveau' : 'Nouveau niveau'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveLevel} className="space-y-3">
                <div>
                  <Label htmlFor="lv-cycle">Cycle *</Label>
                  <select
                    id="lv-cycle"
                    value={levelForm.cycle_id}
                    onChange={e => setLevelForm({ ...levelForm, cycle_id: e.target.value })}
                    required
                    className="mt-1.5 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                  >
                    <option value="">Sélectionner un cycle</option>
                    {cycles.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="lv-nom">Nom *</Label>
                  <Input id="lv-nom" placeholder="ex: CP, 6e, Terminale" value={levelForm.nom} onChange={e => setLevelForm({ ...levelForm, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="lv-ordre">Ordre d'affichage</Label>
                  <Input id="lv-ordre" type="number" min={0} value={levelForm.ordre} onChange={e => setLevelForm({ ...levelForm, ordre: parseInt(e.target.value, 10) || 0 })} className="mt-1.5 rounded-xl" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={savingLevel} className="gap-1.5 rounded-xl">
                    {savingLevel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingLevelId ? 'Enregistrer' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground">Cycles & Niveaux</h3>
              <p className="text-sm text-muted-foreground mt-0.5">École → Cycle → Niveau → Classe. Configurez la structure de votre établissement.</p>
            </div>
            <Button size="sm" onClick={openCreateCycle} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouveau cycle</span>
            </Button>
          </div>

          {hierarchyError && (
            <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
              {hierarchyError}
            </div>
          )}

          {cycles.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun cycle configuré pour le moment.</p>
          )}

          <div className="grid gap-3 sm:gap-4">
            {cycles.map(cycle => (
              <Card key={cycle.id} className="p-4 sm:p-5 rounded-2xl shadow-card">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{cycle.nom}</p>
                      <Badge variant="secondary" className="badge-modern text-xs mt-0.5">
                        {cycle.evaluation_mode === 'qualitatif' ? 'Appréciations qualitatives' : 'Notes /20'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditCycle(cycle)} className="h-8 w-8 p-0 rounded-xl active:scale-95 transition-transform">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCycle(cycle.id)} className="h-8 w-8 p-0 rounded-xl text-destructive active:scale-95 transition-transform">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pl-3 border-l-2 border-border space-y-1.5">
                  {levels.filter(l => l.cycle_id === cycle.id).map(level => (
                    <div key={level.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-muted/50 transition-colors">
                      <span className="flex items-center gap-2 text-sm text-foreground min-w-0">
                        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{level.nom}</span>
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEditLevel(level)} className="h-7 w-7 p-0 rounded-lg active:scale-95 transition-transform">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteLevel(level.id)} className="h-7 w-7 p-0 rounded-lg text-destructive active:scale-95 transition-transform">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => openCreateLevel(cycle.id)}
                    className="flex items-center gap-2 text-sm text-primary px-3 py-2 rounded-xl hover:bg-primary/5 transition-colors w-full"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un niveau
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'users' && (
        <>
          <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Nouvel utilisateur</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <Label htmlFor="u-nom">Nom complet *</Label>
                  <Input id="u-nom" value={userForm.nom} onChange={e => setUserForm({ ...userForm, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="u-email">Email *</Label>
                  <Input id="u-email" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="u-password">Mot de passe *</Label>
                  <Input id="u-password" type="password" minLength={6} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="u-telephone">Téléphone</Label>
                  <Input id="u-telephone" value={userForm.telephone} onChange={e => setUserForm({ ...userForm, telephone: e.target.value })} className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="u-role">Rôle *</Label>
                  <select
                    id="u-role"
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value as typeof userForm.role })}
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    {creatableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {(userForm.role === 'teacher' || userForm.role === 'parent') && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Un profil {userForm.role === 'teacher' ? 'enseignant' : 'parent'} minimal sera créé automatiquement — complétez-le depuis la page {userForm.role === 'teacher' ? 'Enseignants' : 'Parents'}.
                    </p>
                  )}
                </div>
                {userError && <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{userError}</div>}
                <DialogFooter>
                  <Button type="submit" disabled={savingUser} className="rounded-xl active:scale-[0.97] transition-transform">
                    {savingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingUser} onOpenChange={open => !open && setEditingUser(null)}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Modifier {editingUser?.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveEditUser} className="space-y-3">
                {editingUser && !['teacher', 'parent'].includes(editingUser.role) ? (
                  <div>
                    <Label htmlFor="eu-role">Rôle</Label>
                    <select
                      id="eu-role"
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as typeof editRole)}
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    >
                      {editableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Rôle {editingUser ? roleLabels[editingUser.role as Role] : ''} — se modifie depuis la page {editingUser?.role === 'teacher' ? 'Enseignants' : 'Parents'}.
                  </p>
                )}
                <div>
                  <Label htmlFor="eu-statut">Statut</Label>
                  <select
                    id="eu-statut"
                    value={editStatut}
                    onChange={e => setEditStatut(e.target.value as 'actif' | 'inactif')}
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="eu-password">Nouveau mot de passe (optionnel)</Label>
                  <Input id="eu-password" type="password" minLength={6} value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" className="mt-1.5 rounded-xl" />
                </div>
                {editError && <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{editError}</div>}
                <DialogFooter>
                  <Button type="submit" disabled={savingEdit} className="rounded-xl active:scale-[0.97] transition-transform">
                    {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Card className="overflow-hidden rounded-2xl shadow-card">
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">Utilisateurs et permissions</h3>
              <Button size="sm" onClick={openCreateUser} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0">
                <Users className="h-4 w-4" /> <span className="hidden sm:inline">Inviter</span>
              </Button>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Utilisateur</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Email</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Rôle</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Statut</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Actions</th>
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditUser(u)} title="Modifier" className="h-7 w-7 p-0 rounded-lg active:scale-95 transition-transform">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" onClick={() => handleToggleUserStatut(u)} disabled={togglingUserId === u.id}
                              title={u.statut === 'actif' ? 'Désactiver' : 'Activer'}
                              className="h-7 w-7 p-0 rounded-lg active:scale-95 transition-transform"
                            >
                              {togglingUserId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'years' && (
        <>
          <Dialog open={showYearDialog} onOpenChange={setShowYearDialog}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Nouvelle année scolaire</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateYear} className="space-y-3">
                <div>
                  <Label htmlFor="y-libelle">Libellé *</Label>
                  <Input id="y-libelle" placeholder="ex: 2027-2028" value={yearForm.libelle} onChange={e => setYearForm({ ...yearForm, libelle: e.target.value })} required className="mt-1.5 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="y-debut">Début *</Label>
                    <Input id="y-debut" type="date" value={yearForm.date_debut} onChange={e => setYearForm({ ...yearForm, date_debut: e.target.value })} required className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="y-fin">Fin *</Label>
                    <Input id="y-fin" type="date" value={yearForm.date_fin} onChange={e => setYearForm({ ...yearForm, date_fin: e.target.value })} required className="mt-1.5 rounded-xl" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={yearForm.activate} onChange={e => setYearForm({ ...yearForm, activate: e.target.checked })} className="rounded border-input h-4 w-4" />
                  Activer immédiatement (archive l'année active actuelle)
                </label>
                <DialogFooter>
                  <Button type="submit" disabled={savingYear} className="gap-1.5 rounded-xl">
                    {savingYear ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                    Créer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Card className="overflow-hidden rounded-2xl shadow-card">
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">Années scolaires</h3>
              <Button size="sm" onClick={() => setShowYearDialog(true)} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0">
                <Calendar className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle année</span>
              </Button>
            </div>
            {yearError && (
              <div className="mx-4 mt-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
                {yearError}
              </div>
            )}
            <div className="divide-y divide-border">
              {academicYears.map(y => (
                <div key={y.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{y.libelle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {new Date(y.date_debut).toLocaleDateString('fr-FR')} → {new Date(y.date_fin).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {y.statut === 'active' ? (
                    <Badge className="badge-modern shrink-0 bg-success/10 text-success">Active</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={activatingId === y.id}
                      onClick={() => handleActivateYear(y.id)}
                      className="gap-1.5 rounded-xl shrink-0"
                    >
                      {activatingId === y.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Activer
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
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
