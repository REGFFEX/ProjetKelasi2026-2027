'use client';

import { useState, useEffect } from 'react';
import { Plus, Mail, Phone, BookOpen, School, CheckCircle2, XCircle, Loader2, X, KeyRound, Pencil, Trash2 } from 'lucide-react';
import {
  fetchTeachers, fetchSubjects, fetchClassrooms, fetchAssignments,
  createTeacher, updateTeacher, deleteTeacher, type AssignmentPairInput, type DbTeacher,
} from '@/lib/api';
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
import { useAuth } from '@/lib/auth-context';
import { canWrite } from '@/lib/permissions';

const emptyTeacherForm = { nom: '', prenom: '', email: '', telephone: '', assignments: [] as AssignmentPairInput[] };

export function TeachersContent() {
  const { profile } = useAuth();
  const canManage = canWrite(profile?.role, 'teachers');
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Awaited<ReturnType<typeof fetchTeachers>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(emptyTeacherForm);
  const [pendingSubjectId, setPendingSubjectId] = useState('');
  const [pendingClassroomId, setPendingClassroomId] = useState('');
  const [withLogin, setWithLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, s, c] = await Promise.all([fetchTeachers(), fetchSubjects(), fetchClassrooms()]);
        if (cancelled) return;
        setTeachers(t);
        setSubjects(s);
        setClassrooms(c);
      } catch (e) {
        console.error('Failed to load teachers data:', e);
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

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.nom || 'Inconnu';
  const getClassroomName = (id: string) => classrooms.find(c => c.id === id)?.nom || 'Inconnu';

  const addAssignment = () => {
    if (!pendingSubjectId || !pendingClassroomId) return;
    const exists = form.assignments.some(a => a.subject_id === pendingSubjectId && a.classroom_id === pendingClassroomId);
    if (exists) return;
    setForm(prev => ({ ...prev, assignments: [...prev.assignments, { subject_id: pendingSubjectId, classroom_id: pendingClassroomId }] }));
    setPendingSubjectId('');
    setPendingClassroomId('');
  };

  const removeAssignment = (subjectId: string, classroomId: string) => {
    setForm(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => !(a.subject_id === subjectId && a.classroom_id === classroomId)),
    }));
  };

  const resetDialogState = () => {
    setForm(emptyTeacherForm);
    setWithLogin(false);
    setLoginPassword('');
    setFormError('');
    setEditingTeacherId(null);
  };

  const openCreate = () => {
    resetDialogState();
    setShowDialog(true);
  };

  const openEdit = async (teacher: DbTeacher) => {
    setEditingTeacherId(teacher.id);
    setForm({ nom: teacher.nom, prenom: teacher.prenom, email: teacher.email, telephone: teacher.telephone, assignments: [] });
    setWithLogin(false);
    setLoginPassword('');
    setFormError('');
    setShowDialog(true);
    setLoadingAssignments(true);
    try {
      const assignments = await fetchAssignments(teacher.id);
      setForm(prev => ({ ...prev, assignments: assignments.map(a => ({ subject_id: a.subject_id, classroom_id: a.classroom_id })) }));
    } catch (err) {
      console.error('Failed to load teacher assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim()) return;
    if (withLogin && loginPassword.length < 6) return;
    setSaving(true);
    setFormError('');
    try {
      const payload = withLogin ? { ...form, password: loginPassword } : form;
      if (editingTeacherId) {
        const updated = await updateTeacher(editingTeacherId, payload);
        setTeachers(prev => prev.map(t => (t.id === updated.id ? updated : t)).sort((a, b) => a.nom.localeCompare(b.nom)));
      } else {
        const created = await createTeacher(payload);
        setTeachers(prev => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)));
      }
      setShowDialog(false);
      resetDialogState();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet enseignant ? Ses affectations et son éventuel compte de connexion seront également supprimés.')) return;
    setDeletingId(id);
    try {
      await deleteTeacher(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete teacher:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Enseignants</h1>
          <p className="text-muted-foreground mt-1">{teachers.length} enseignant(s) — {teachers.filter(t => t.statut === 'actif').length} actifs</p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvel enseignant</span>
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetDialogState(); }}>
        <DialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeacherId ? "Modifier l'enseignant" : 'Nouvel enseignant'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-prenom">Prénom *</Label>
                <Input id="t-prenom" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} required className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="t-nom">Nom *</Label>
                <Input id="t-nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div>
              <Label htmlFor="t-email">Email *</Label>
              <Input id="t-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="t-telephone">Téléphone</Label>
              <Input id="t-telephone" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div className="rounded-xl border border-border p-3">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={withLogin} onChange={e => setWithLogin(e.target.checked)} className="rounded border-input" />
                <span className="font-medium text-foreground">
                  {editingTeacherId ? 'Réinitialiser le mot de passe' : 'Créer un accès de connexion'}
                </span>
              </label>
              {withLogin && (
                <div className="mt-2.5">
                  <Label htmlFor="t-password">{editingTeacherId ? 'Nouveau mot de passe *' : 'Mot de passe *'}</Label>
                  <Input id="t-password" type="password" minLength={6} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required={withLogin} className="mt-1.5 rounded-xl" />
                </div>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">Affectations (matière → classe)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Détermine ce que cet enseignant pourra noter et pour quelles classes — pas d'accès en dehors de ces affectations.
              </p>
              <div className="flex gap-2">
                <select
                  value={pendingSubjectId}
                  onChange={e => setPendingSubjectId(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-muted/30 px-2.5 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="">Matière...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                <select
                  value={pendingClassroomId}
                  onChange={e => setPendingClassroomId(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-muted/30 px-2.5 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="">Classe...</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                <Button type="button" size="sm" variant="outline" onClick={addAssignment} disabled={!pendingSubjectId || !pendingClassroomId} className="shrink-0 rounded-xl">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto scrollbar-thin">
                {loadingAssignments ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Chargement des affectations...</p>
                ) : (
                  <>
                    {form.assignments.map(a => (
                      <span key={`${a.subject_id}-${a.classroom_id}`} className="badge-modern text-xs px-2.5 py-1 rounded-full border border-primary bg-primary/10 text-primary inline-flex items-center gap-1.5">
                        {getSubjectName(a.subject_id)} → {getClassroomName(a.classroom_id)}
                        <button type="button" onClick={() => removeAssignment(a.subject_id, a.classroom_id)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {form.assignments.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucune affectation pour le moment.</p>
                    )}
                  </>
                )}
              </div>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-1.5 rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingTeacherId ? null : <Plus className="h-4 w-4" />}
                {editingTeacherId ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {teachers.map(t => (
          <Card
            key={t.id}
            className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-info/10 text-primary font-semibold shrink-0">
                {t.prenom[0]}{t.nom[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{t.prenom} {t.nom}</p>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className={cn(
                    'badge-modern inline-flex items-center gap-1 text-xs font-medium',
                    t.statut === 'actif' ? 'text-success' : 'text-muted-foreground'
                  )}>
                    {t.statut === 'actif' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {t.statut === 'actif' ? 'Actif' : 'Inactif'}
                  </span>
                  {t.user_id && (
                    <span className="badge-modern inline-flex items-center gap-1 text-xs font-medium text-primary" title="Compte de connexion actif">
                      <KeyRound className="h-3 w-3" /> Connexion
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)} className="h-8 w-8 p-0 rounded-xl active:scale-95 transition-transform">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}
                    className="h-8 w-8 p-0 rounded-xl text-destructive active:scale-95 transition-transform"
                  >
                    {deletingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t.email}</span>
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t.telephone}</span>
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> Matières
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto scrollbar-thin">
                  {t.matiere_ids.map(id => (
                    <Badge key={id} variant="secondary" className="badge-modern text-xs">{getSubjectName(id)}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <School className="h-3.5 w-3.5" /> Classes
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto scrollbar-thin">
                  {t.classroom_ids.map(id => (
                    <Badge key={id} variant="outline" className="badge-modern text-xs">{getClassroomName(id)}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
