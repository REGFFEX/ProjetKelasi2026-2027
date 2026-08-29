'use client';

import { useState, useEffect, useMemo } from 'react';
import { CalendarDays, Plus, Pencil, Trash2, Loader2, Clock, MapPin } from 'lucide-react';
import {
  fetchTimetable,
  fetchAssignments,
  fetchClassrooms,
  fetchSubjects,
  fetchTeachers,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  type Weekday,
} from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { canWrite } from '@/lib/permissions';
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

const DAYS: { id: Weekday; label: string }[] = [
  { id: 'lundi', label: 'Lundi' },
  { id: 'mardi', label: 'Mardi' },
  { id: 'mercredi', label: 'Mercredi' },
  { id: 'jeudi', label: 'Jeudi' },
  { id: 'vendredi', label: 'Vendredi' },
  { id: 'samedi', label: 'Samedi' },
];

const emptyForm = { assignment_id: '', jour: 'lundi' as Weekday, heure_debut: '08:00', heure_fin: '09:00', salle: '' };

export function TimetableContent() {
  const { profile } = useAuth();
  const canManage = canWrite(profile?.role, 'timetable');

  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof fetchTimetable>>>([]);
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof fetchAssignments>>>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);
  const [teachers, setTeachers] = useState<Awaited<ReturnType<typeof fetchTeachers>>>([]);
  const [classroomFilter, setClassroomFilter] = useState('all');

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      const [s, a, c, sub, t] = await Promise.all([
        fetchTimetable(),
        fetchAssignments(),
        fetchClassrooms(),
        fetchSubjects(),
        fetchTeachers(),
      ]);
      setSlots(s);
      setAssignments(a);
      setClassrooms(c);
      setSubjects(sub);
      setTeachers(t);
    } catch (e) {
      console.error('Failed to load timetable data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getAssignment = (id: string) => assignments.find(a => a.id === id);
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.nom || 'Inconnu';
  const getClassroomName = (id: string) => classrooms.find(c => c.id === id)?.nom || 'Inconnu';
  const getTeacherName = (id: string) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.prenom} ${t.nom}` : 'Inconnu';
  };

  const enrichedSlots = useMemo(() => {
    return slots
      .map(slot => {
        const assignment = getAssignment(slot.assignment_id);
        return {
          ...slot,
          subjectName: assignment ? getSubjectName(assignment.subject_id) : 'Inconnu',
          classroomName: assignment ? getClassroomName(assignment.classroom_id) : 'Inconnu',
          teacherName: assignment ? getTeacherName(assignment.teacher_id) : 'Inconnu',
          classroomId: assignment?.classroom_id,
        };
      })
      .filter(s => classroomFilter === 'all' || s.classroomId === classroomFilter)
      .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
  }, [slots, assignments, subjects, classrooms, teachers, classroomFilter]);

  const slotsByDay = (day: Weekday) => enrichedSlots.filter(s => s.jour === day);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowDialog(true);
  };

  const openEdit = (slot: (typeof enrichedSlots)[number]) => {
    setEditingId(slot.id);
    setForm({
      assignment_id: slot.assignment_id,
      jour: slot.jour,
      heure_debut: slot.heure_debut.slice(0, 5),
      heure_fin: slot.heure_fin.slice(0, 5),
      salle: slot.salle || '',
    });
    setFormError('');
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assignment_id) return;
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        assignment_id: form.assignment_id,
        jour: form.jour,
        heure_debut: `${form.heure_debut}:00`,
        heure_fin: `${form.heure_fin}:00`,
        salle: form.salle || null,
      };
      if (editingId) {
        const updated = await updateTimetableSlot(editingId, payload);
        setSlots(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createTimetableSlot(payload);
        setSlots(prev => [...prev, created]);
      }
      setShowDialog(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Échec de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce créneau ?')) return;
    try {
      await deleteTimetableSlot(id);
      setSlots(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete slot:', err);
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{canManage ? 'Emploi du temps' : 'Mes horaires'}</h1>
          <p className="text-muted-foreground mt-1">
            {canManage ? "Gérez les créneaux hebdomadaires par classe et enseignant" : 'Vos créneaux de cours cette semaine'}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouveau créneau</span>
          </Button>
        )}
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-3">
          <select
            value={classroomFilter}
            onChange={e => setClassroomFilter(e.target.value)}
            className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          >
            <option value="all">Toutes les classes</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le créneau' : 'Nouveau créneau'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <Label htmlFor="tt-assignment">Affectation (enseignant · matière · classe) *</Label>
              <select
                id="tt-assignment"
                value={form.assignment_id}
                onChange={e => setForm({ ...form, assignment_id: e.target.value })}
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
              >
                <option value="">Sélectionner une affectation</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>
                    {getTeacherName(a.teacher_id)} · {getSubjectName(a.subject_id)} · {getClassroomName(a.classroom_id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tt-jour">Jour *</Label>
                <select
                  id="tt-jour"
                  value={form.jour}
                  onChange={e => setForm({ ...form, jour: e.target.value as Weekday })}
                  className="mt-1.5 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                >
                  {DAYS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="tt-salle">Salle</Label>
                <Input id="tt-salle" value={form.salle} onChange={e => setForm({ ...form, salle: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tt-debut">Heure début *</Label>
                <Input id="tt-debut" type="time" value={form.heure_debut} onChange={e => setForm({ ...form, heure_debut: e.target.value })} required className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="tt-fin">Heure fin *</Label>
                <Input id="tt-fin" type="time" value={form.heure_fin} onChange={e => setForm({ ...form, heure_fin: e.target.value })} required className="mt-1.5 rounded-xl" />
              </div>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-1.5 rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editingId ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {DAYS.map(day => {
          const daySlots = slotsByDay(day.id);
          return (
            <Card key={day.id} className="p-4 sm:p-5 rounded-2xl shadow-card">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> {day.label}
              </h3>
              {daySlots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Aucun cours.</p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map(slot => (
                    <div key={slot.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{slot.subjectName}</p>
                          <p className="text-xs text-muted-foreground truncate">{slot.classroomName} · {slot.teacherName}</p>
                        </div>
                        {canManage && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(slot)} className="h-7 w-7 p-0 rounded-lg">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(slot.id)} className="h-7 w-7 p-0 rounded-lg text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {slot.heure_debut.slice(0, 5)}–{slot.heure_fin.slice(0, 5)}</span>
                        {slot.salle && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {slot.salle}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
