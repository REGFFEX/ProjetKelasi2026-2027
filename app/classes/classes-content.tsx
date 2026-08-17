'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, School, Users, MapPin, GraduationCap, BookOpen, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  fetchClassrooms,
  fetchStudents,
  fetchTeachers,
  fetchSubjects,
  fetchCycles,
  fetchLevels,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  createSubject,
  updateSubject,
  deleteSubject,
} from '@/lib/api';
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

type Tab = 'classes' | 'subjects';

const emptyClassForm = { level_id: '', nom: '', salle: '', filiere: '', enseignant_principal_id: '' };
const emptySubjectForm = { nom: '', coefficient: 1 };

export function ClassesContent() {
  const [tab, setTab] = useState<Tab>('classes');
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [teachers, setTeachers] = useState<Awaited<ReturnType<typeof fetchTeachers>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);
  const [cycles, setCycles] = useState<Awaited<ReturnType<typeof fetchCycles>>>([]);
  const [levels, setLevels] = useState<Awaited<ReturnType<typeof fetchLevels>>>([]);

  const [showClassDialog, setShowClassDialog] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [savingClass, setSavingClass] = useState(false);

  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);
  const [savingSubject, setSavingSubject] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, s, t, sub, cyc, lvl] = await Promise.all([
          fetchClassrooms(),
          fetchStudents(),
          fetchTeachers(),
          fetchSubjects(),
          fetchCycles(),
          fetchLevels(),
        ]);
        if (cancelled) return;
        setClassrooms(c);
        setStudents(s);
        setTeachers(t);
        setSubjects(sub);
        setCycles(cyc);
        setLevels(lvl);
      } catch (e) {
        console.error('Failed to load classes data:', e);
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

  const getTeacherName = (id: string) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.prenom} ${t.nom}` : 'Inconnu';
  };

  const getLevelLabel = (levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return 'Inconnu';
    const cycle = cycles.find(cy => cy.id === level.cycle_id);
    return cycle ? `${level.nom} (${cycle.nom})` : level.nom;
  };

  const openCreateDialog = () => {
    if (tab === 'classes') {
      setEditingClassId(null);
      setClassForm(emptyClassForm);
      setShowClassDialog(true);
    } else {
      setEditingSubjectId(null);
      setSubjectForm(emptySubjectForm);
      setShowSubjectDialog(true);
    }
  };

  const openEditClass = (c: Awaited<ReturnType<typeof fetchClassrooms>>[number]) => {
    setEditingClassId(c.id);
    setClassForm({
      level_id: c.level_id,
      nom: c.nom,
      salle: c.salle,
      filiere: c.filiere || '',
      enseignant_principal_id: c.enseignant_principal_id || '',
    });
    setShowClassDialog(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.level_id || !classForm.nom.trim()) return;
    setSavingClass(true);
    try {
      const payload = {
        level_id: classForm.level_id,
        nom: classForm.nom,
        salle: classForm.salle,
        filiere: classForm.filiere || null,
        enseignant_principal_id: classForm.enseignant_principal_id || null,
      };
      if (editingClassId) {
        const updated = await updateClassroom(editingClassId, payload);
        setClassrooms(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createClassroom(payload);
        setClassrooms(prev => [...prev, created]);
      }
      setShowClassDialog(false);
    } catch (err) {
      console.error('Failed to save classroom:', err);
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm('Supprimer cette classe ?')) return;
    try {
      await deleteClassroom(id);
      setClassrooms(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete classroom:', err);
    }
  };

  const openEditSubject = (s: Awaited<ReturnType<typeof fetchSubjects>>[number]) => {
    setEditingSubjectId(s.id);
    setSubjectForm({ nom: s.nom, coefficient: s.coefficient });
    setShowSubjectDialog(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.nom.trim()) return;
    setSavingSubject(true);
    try {
      if (editingSubjectId) {
        const updated = await updateSubject(editingSubjectId, subjectForm);
        setSubjects(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createSubject(subjectForm);
        setSubjects(prev => [...prev, created]);
      }
      setShowSubjectDialog(false);
    } catch (err) {
      console.error('Failed to save subject:', err);
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Supprimer cette matière ?')) return;
    try {
      await deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Classes & Matières</h1>
          <p className="text-muted-foreground mt-1">Gérez les classes, salles et matières de l'établissement</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{tab === 'classes' ? 'Nouvelle classe' : 'Nouvelle matière'}</span>
        </Button>
      </div>

      <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingClassId ? 'Modifier la classe' : 'Nouvelle classe'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveClass} className="space-y-3">
            <div>
              <Label htmlFor="c-niveau">Niveau *</Label>
              <select
                id="c-niveau"
                value={classForm.level_id}
                onChange={e => setClassForm({ ...classForm, level_id: e.target.value })}
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
              >
                <option value="">Sélectionner un niveau</option>
                {levels.map(l => <option key={l.id} value={l.id}>{getLevelLabel(l.id)}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="c-nom">Nom *</Label>
              <Input id="c-nom" value={classForm.nom} onChange={e => setClassForm({ ...classForm, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="c-salle">Salle</Label>
              <Input id="c-salle" value={classForm.salle} onChange={e => setClassForm({ ...classForm, salle: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="c-filiere">Filière (optionnel)</Label>
              <Input id="c-filiere" value={classForm.filiere} onChange={e => setClassForm({ ...classForm, filiere: e.target.value })} placeholder="ex: Math-Physique" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="c-prof">Professeur principal</Label>
              <select
                id="c-prof"
                value={classForm.enseignant_principal_id}
                onChange={e => setClassForm({ ...classForm, enseignant_principal_id: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
              >
                <option value="">Non assigné</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={savingClass} className="gap-1.5 rounded-xl">
                {savingClass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editingClassId ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingSubjectId ? 'Modifier la matière' : 'Nouvelle matière'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSubject} className="space-y-3">
            <div>
              <Label htmlFor="s-nom">Nom *</Label>
              <Input id="s-nom" value={subjectForm.nom} onChange={e => setSubjectForm({ ...subjectForm, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="s-coef">Coefficient</Label>
              <Input id="s-coef" type="number" min={1} value={subjectForm.coefficient} onChange={e => setSubjectForm({ ...subjectForm, coefficient: parseInt(e.target.value, 10) || 1 })} className="mt-1.5 rounded-xl" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={savingSubject} className="gap-1.5 rounded-xl">
                {savingSubject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editingSubjectId ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('classes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 -mb-px active:scale-95',
            tab === 'classes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <School className="h-4 w-4" /> <span className="hidden sm:inline">Classes</span>
        </button>
        <button
          onClick={() => setTab('subjects')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 -mb-px active:scale-95',
            tab === 'subjects' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Matières</span>
        </button>
      </div>

      {tab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {classrooms.map(c => {
            const classStudents = students.filter(s => s.classroom_id === c.id);
            return (
              <Card
                key={c.id}
                className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-info/10">
                    <School className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditClass(c)} className="h-8 w-8 p-0 rounded-xl active:scale-95 transition-transform">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClass(c.id)} className="h-8 w-8 p-0 rounded-xl text-destructive active:scale-95 transition-transform">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground truncate">{c.nom}</h3>
                <Badge variant="secondary" className="badge-modern mt-1">{getLevelLabel(c.level_id)}</Badge>
                {c.filiere && <Badge variant="outline" className="badge-modern mt-1 ml-1.5">{c.filiere}</Badge>}

                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{c.salle}</span>
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" /> {classStudents.length} élève(s)
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Prof. principal: {c.enseignant_principal_id ? getTeacherName(c.enseignant_principal_id) : 'Non assigné'}</span>
                  </p>
                </div>

                <Link href="/students">
                  <Button variant="outline" size="sm" className="w-full mt-4 rounded-xl active:scale-[0.97] transition-transform">Voir les élèves</Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'subjects' && (
        <Card className="overflow-hidden rounded-2xl shadow-card">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Matière</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Coefficient</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.map(s => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-info/10">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{s.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary" className="badge-modern">Coef. {s.coefficient}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditSubject(s)} className="h-8 w-8 p-0 rounded-xl active:scale-95 transition-transform">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSubject(s.id)} className="h-8 w-8 p-0 rounded-xl text-destructive active:scale-95 transition-transform">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
