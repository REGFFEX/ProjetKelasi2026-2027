'use client';

import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Plus, Eye, CheckCircle, Clock, FileText, Download, Send, ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import {
  fetchAssessments,
  fetchSubjects,
  fetchClassrooms,
  fetchStudents,
  fetchGrades,
  fetchCycles,
  fetchLevels,
  fetchEvaluationTypes,
  fetchTerms,
  fetchAssignments,
  fetchAcademicYears,
  createAssessment,
  deleteAssessment,
  upsertGrades,
  type AssessmentInput,
} from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import type { GradeStatus } from '@/lib/types';
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
import { useAuth } from '@/lib/auth-context';
import { canWrite } from '@/lib/permissions';

const statusConfig: Record<GradeStatus, { label: string; icon: typeof CheckCircle; color: string; bg: string; dot: string }> = {
  brouillon: { label: 'Brouillon', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
  valide: { label: 'Validé', icon: CheckCircle, color: 'text-info', bg: 'bg-info/10', dot: 'bg-info' },
  publie: { label: 'Publié', icon: Send, color: 'text-success', bg: 'bg-success/10', dot: 'bg-success' },
};

type View = 'list' | 'entry' | 'bulletin';

export function GradesContent() {
  const { profile } = useAuth();
  const canManage = canWrite(profile?.role, 'grades');
  const [view, setView] = useState<View>('list');
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [bulletinStudentId, setBulletinStudentId] = useState<string | null>(null);
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [gradesError, setGradesError] = useState('');

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof fetchAssessments>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof fetchGrades>>>([]);
  const [cycles, setCycles] = useState<Awaited<ReturnType<typeof fetchCycles>>>([]);
  const [levels, setLevels] = useState<Awaited<ReturnType<typeof fetchLevels>>>([]);
  const [evaluationTypes, setEvaluationTypes] = useState<Awaited<ReturnType<typeof fetchEvaluationTypes>>>([]);
  const [terms, setTerms] = useState<Awaited<ReturnType<typeof fetchTerms>>>([]);
  const [academicYears, setAcademicYears] = useState<Awaited<ReturnType<typeof fetchAcademicYears>>>([]);
  const [myAssignments, setMyAssignments] = useState<Awaited<ReturnType<typeof fetchAssignments>> | null>(null);

  const emptyAssessmentForm = { libelle: '', subject_id: '', classroom_id: '', academic_year_id: '', term_id: '', evaluation_type_id: '', date: '', coefficient: 1 };
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState(emptyAssessmentForm);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, s, c, st, g, cyc, lvl, et, tm, ay] = await Promise.all([
          fetchAssessments(),
          fetchSubjects(),
          fetchClassrooms(),
          fetchStudents(),
          fetchGrades(),
          fetchCycles(),
          fetchLevels(),
          fetchEvaluationTypes(),
          fetchTerms(),
          fetchAcademicYears(),
        ]);
        if (cancelled) return;
        setAssessments(a);
        setSubjects(s);
        setClassrooms(c);
        setStudents(st);
        setGrades(g);
        setCycles(cyc);
        setLevels(lvl);
        setEvaluationTypes(et);
        setTerms(tm);
        setAcademicYears(ay);
        if (profile?.role === 'teacher') {
          const assignments = await fetchAssignments();
          if (cancelled) return;
          setMyAssignments(assignments);
        }
      } catch (e) {
        console.error('Failed to load grades data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.role]);

  // A teacher's perimeter on this page is her own assigned subjects — used to narrow
  // both the create dialog's subject dropdown (assert_teacher_scope 403s otherwise)
  // and the "Toutes les matières" filter/list, which mirror the same scope.
  const myAssignedSubjectIds = useMemo(
    () => (myAssignments ? new Set(myAssignments.map(as => as.subject_id)) : null),
    [myAssignments]
  );
  const mySubjects = myAssignedSubjectIds ? subjects.filter(s => myAssignedSubjectIds.has(s.id)) : subjects;

  // Once a classe is picked in the form, narrow "Matière" further to only what this
  // teacher actually teaches in that specific classe (a TeacherAssignment pairing),
  // matching what assert_teacher_scope enforces server-side on create.
  const formSubjects = useMemo(() => {
    if (!myAssignments || !assessmentForm.classroom_id) return mySubjects;
    const subjectIdsForClassroom = new Set(
      myAssignments.filter(as => as.classroom_id === assessmentForm.classroom_id).map(as => as.subject_id)
    );
    return mySubjects.filter(s => subjectIdsForClassroom.has(s.id));
  }, [myAssignments, assessmentForm.classroom_id, mySubjects]);

  const termsForYear = assessmentForm.academic_year_id
    ? terms.filter(t => t.academic_year_id === assessmentForm.academic_year_id)
    : terms;

  const openCreateAssessment = () => {
    const activeYear = academicYears.find(y => y.statut === 'active');
    setAssessmentForm({ ...emptyAssessmentForm, academic_year_id: activeYear?.id || '' });
    setAssessmentError('');
    setShowCreateAssessment(true);
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentForm.libelle.trim() || !assessmentForm.subject_id || !assessmentForm.classroom_id || !assessmentForm.academic_year_id || !assessmentForm.term_id || !assessmentForm.date) return;
    setSavingAssessment(true);
    setAssessmentError('');
    try {
      const payload: AssessmentInput = {
        libelle: assessmentForm.libelle,
        subject_id: assessmentForm.subject_id,
        classroom_id: assessmentForm.classroom_id,
        term_id: assessmentForm.term_id,
        date: assessmentForm.date,
        coefficient: assessmentForm.coefficient,
        evaluation_type_id: assessmentForm.evaluation_type_id || null,
      };
      const created = await createAssessment(payload);
      setAssessments(prev => [created, ...prev]);
      setShowCreateAssessment(false);
    } catch (err) {
      setAssessmentError(err instanceof ApiError ? err.message : "Échec de la création de l'évaluation.");
    } finally {
      setSavingAssessment(false);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!window.confirm('Supprimer cette évaluation ?')) return;
    try {
      await deleteAssessment(assessmentId);
      setAssessments(prev => prev.filter(a => a.id !== assessmentId));
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Échec de la suppression de l'évaluation.");
    }
  };

  const isQualitatif = (classroomId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    const level = classroom ? levels.find(l => l.id === classroom.level_id) : undefined;
    const cycle = level ? cycles.find(cy => cy.id === level.cycle_id) : undefined;
    return cycle?.evaluation_mode === 'qualitatif';
  };

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.nom || 'Inconnu';
  const getClassroomName = (id: string) => classrooms.find(c => c.id === id)?.nom || 'Inconnu';

  // A teacher's évaluations are scoped to her own subjects here — she manages her
  // own subject's grades, not a colleague's, even inside her own homeroom classroom.
  const myAssessments = myAssignedSubjectIds
    ? assessments.filter(a => myAssignedSubjectIds.has(a.subject_id))
    : assessments;

  const filteredAssessments = useMemo(() => {
    return myAssessments.filter(a => {
      const matchClass = selectedClassroom === 'all' || a.classroom_id === selectedClassroom;
      const matchSubject = selectedSubject === 'all' || a.subject_id === selectedSubject;
      return matchClass && matchSubject;
    });
  }, [myAssessments, selectedClassroom, selectedSubject]);

  const handleEnterGrades = (assessmentId: string) => {
    setSelectedAssessment(assessmentId);
    const assessment = assessments.find(a => a.id === assessmentId);
    if (assessment) {
      const classStudents = students.filter(s => s.classroom_id === assessment.classroom_id);
      const existingGrades: Record<string, string> = {};
      classStudents.forEach(s => {
        const grade = grades.find(g => g.student_id === s.id && g.assessment_id === assessmentId);
        if (grade) existingGrades[s.id] = String(grade.note);
      });
      setGradeValues(existingGrades);
    }
    setView('entry');
  };

  const handleViewBulletin = (studentId: string) => {
    setBulletinStudentId(studentId);
    setView('bulletin');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ===== LIST VIEW =====
  if (view === 'list') {
    return (
      <div className="space-y-5 sm:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notes & Évaluations</h1>
            <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Gérez les évaluations, la saisie et la publication des notes</p>
          </div>
          {canManage && (
            <Button onClick={openCreateAssessment} className="gap-1.5 rounded-xl shrink-0 active:scale-95 transition-all">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle évaluation</span><span className="sm:hidden">Évaluation</span>
            </Button>
          )}
        </div>

        <Dialog open={showCreateAssessment} onOpenChange={setShowCreateAssessment}>
          <DialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle évaluation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAssessment} className="space-y-3">
              <div>
                <Label htmlFor="as-libelle">Intitulé *</Label>
                <Input id="as-libelle" placeholder="ex: Interrogation 1" value={assessmentForm.libelle} onChange={e => setAssessmentForm({ ...assessmentForm, libelle: e.target.value })} required className="mt-1.5 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="as-classroom">Classe *</Label>
                  <select
                    id="as-classroom" value={assessmentForm.classroom_id}
                    onChange={e => {
                      const classroom_id = e.target.value;
                      setAssessmentForm(prev => ({ ...prev, classroom_id, subject_id: '' }));
                    }}
                    required
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Choisir...</option>
                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="as-subject">Matière *</Label>
                  <select
                    id="as-subject" value={assessmentForm.subject_id} onChange={e => setAssessmentForm({ ...assessmentForm, subject_id: e.target.value })} required
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Choisir...</option>
                    {formSubjects.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="as-year">Année scolaire *</Label>
                <select
                  id="as-year" value={assessmentForm.academic_year_id}
                  onChange={e => setAssessmentForm(prev => ({ ...prev, academic_year_id: e.target.value, term_id: '' }))}
                  required
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choisir...</option>
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>{y.libelle}{y.statut === 'active' ? ' (en cours)' : ''}</option>
                  ))}
                </select>
              </div>
              {assessmentForm.academic_year_id && termsForYear.length === 0 && (
                <div className="rounded-xl bg-warning/10 px-3 py-2.5 text-xs text-warning">
                  Aucune période scolaire n'existe encore pour cette année — une évaluation doit être rattachée à une période
                  (ex: Trimestre 1). Demandez au directeur ou au secrétariat d'en créer une dans
                  Paramètres → Années scolaires avant de continuer.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="as-term">Période *</Label>
                  <select
                    id="as-term" value={assessmentForm.term_id} onChange={e => setAssessmentForm({ ...assessmentForm, term_id: e.target.value })} required
                    disabled={!assessmentForm.academic_year_id}
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">Choisir...</option>
                    {termsForYear.map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="as-type">Type</Label>
                  <select
                    id="as-type" value={assessmentForm.evaluation_type_id} onChange={e => setAssessmentForm({ ...assessmentForm, evaluation_type_id: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {evaluationTypes.map(et => <option key={et.id} value={et.id}>{et.nom}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="as-date">Date *</Label>
                  <Input id="as-date" type="date" value={assessmentForm.date} onChange={e => setAssessmentForm({ ...assessmentForm, date: e.target.value })} required className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="as-coef">Coefficient</Label>
                  <Input id="as-coef" type="number" min={1} value={assessmentForm.coefficient} onChange={e => setAssessmentForm({ ...assessmentForm, coefficient: parseInt(e.target.value, 10) || 1 })} className="mt-1.5 rounded-xl" />
                </div>
              </div>
              {assessmentError && <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{assessmentError}</div>}
              <DialogFooter>
                <Button type="submit" disabled={savingAssessment} className="gap-1.5 rounded-xl">
                  {savingAssessment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Créer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedClassroom}
            onChange={e => setSelectedClassroom(e.target.value)}
            className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          >
            <option value="all">Toutes les classes</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          >
            <option value="all">Toutes les matières</option>
            {mySubjects.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </div>

        {/* Assessments */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredAssessments.map(a => {
            const subject = subjects.find(s => s.id === a.subject_id);
            const classroom = classrooms.find(c => c.id === a.classroom_id);
            const classStudents = students.filter(s => s.classroom_id === a.classroom_id);
            const assessmentGrades = grades.filter(g => g.assessment_id === a.id);
            const status = (assessmentGrades[0]?.statut_validation || 'brouillon') as GradeStatus;
            const cfg = statusConfig[status];
            const Icon = cfg.icon;
            const notedGrades = assessmentGrades.filter((g): g is typeof g & { note: number } => g.note !== null);
            const avg = notedGrades.length > 0
              ? (notedGrades.reduce((sum, g) => sum + g.note, 0) / notedGrades.length).toFixed(1)
              : '—';

            return (
              <Card key={a.id} className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <span className={cn('badge-modern', cfg.bg, cfg.color)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                    <Icon className="h-3 w-3" /> {cfg.label}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-sm truncate">{a.libelle}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground truncate">{getSubjectName(a.subject_id)} · {getClassroomName(a.classroom_id)}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Coef. {a.coefficient} · {new Date(a.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground hidden sm:block">Moyenne</p>
                    <p className="text-lg font-bold text-foreground">{avg}<span className="text-sm text-muted-foreground">/20</span></p>
                  </div>
                  <div className="flex gap-1">
                    {canManage && (
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl active:scale-95 transition-all" onClick={() => handleEnterGrades(a.id)}>
                        <FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Saisir</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg active:scale-95 transition-all">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canManage && status !== 'publie' && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                        onClick={() => handleDeleteAssessment(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bulletin generator — a director/secretariat document, not a teacher task;
            a teacher's job here stops at entering grades (the "Saisir" flow above). */}
        {profile?.role !== 'teacher' && (
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">Génération de bulletins</h3>
            <p className="text-sm text-muted-foreground mb-4 hidden sm:block">Sélectionnez un élève pour générer son bulletin</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.slice(0, 12).map(s => (
                <button
                  key={s.id}
                  onClick={() => handleViewBulletin(s.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left active:scale-95"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-info/10 text-primary text-sm font-semibold shrink-0">
                    {s.prenom[0]}{s.nom[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.prenom} {s.nom}</p>
                    <p className="text-xs text-muted-foreground truncate hidden sm:block">{getClassroomName(s.classroom_id || '')}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ===== GRADE ENTRY VIEW =====
  if (view === 'entry' && selectedAssessment) {
    const assessment = assessments.find(a => a.id === selectedAssessment);
    if (!assessment) return null;
    const classStudents = students.filter(s => s.classroom_id === assessment.classroom_id);
    const qualitatif = isQualitatif(assessment.classroom_id);

    const applySaved = (saved: Awaited<ReturnType<typeof upsertGrades>>) => {
      setGrades(prev => {
        const savedStudentIds = new Set(saved.map(g => g.student_id));
        const others = prev.filter(g => !(g.assessment_id === assessment.id && savedStudentIds.has(g.student_id)));
        return [...others, ...saved];
      });
    };

    const handleSaveGrades = async () => {
      setGradesError('');
      const records = qualitatif
        ? classStudents
            .map(s => ({ student_id: s.id, raw: gradeValues[s.id] }))
            .filter(r => r.raw !== undefined && r.raw.trim() !== '')
            .map(r => ({ assessment_id: assessment.id, student_id: r.student_id, appreciation: r.raw }))
        : classStudents
            .map(s => ({ student_id: s.id, raw: gradeValues[s.id] }))
            .filter(r => r.raw !== undefined && r.raw !== '' && !isNaN(parseFloat(r.raw)) && parseFloat(r.raw) >= 0 && parseFloat(r.raw) <= 20)
            .map(r => ({ assessment_id: assessment.id, student_id: r.student_id, note: parseFloat(r.raw) }));

      if (records.length === 0) return;
      setSavingGrades(true);
      try {
        applySaved(await upsertGrades(records));
      } catch (e) {
        setGradesError(e instanceof ApiError ? e.message : 'Échec de l\'enregistrement des notes.');
      } finally {
        setSavingGrades(false);
      }
    };

    const handleSetStatus = async (statut: 'valide' | 'publie') => {
      const existing = grades.filter(g => g.assessment_id === assessment.id);
      if (existing.length === 0) {
        setGradesError('Aucune note enregistrée pour cette évaluation.');
        return;
      }
      setGradesError('');
      setSavingGrades(true);
      try {
        const records = existing.map(g => ({
          assessment_id: g.assessment_id,
          student_id: g.student_id,
          note: g.note,
          appreciation: g.appreciation,
          statut_validation: statut,
        }));
        applySaved(await upsertGrades(records));
      } catch (e) {
        setGradesError(e instanceof ApiError ? e.message : 'Échec de la mise à jour du statut.');
      } finally {
        setSavingGrades(false);
      }
    };

    return (
      <div className="space-y-5 sm:space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl active:scale-95 transition-all" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{assessment.libelle}</h1>
            <p className="text-sm text-muted-foreground truncate hidden sm:block">{getSubjectName(assessment.subject_id)} · {getClassroomName(assessment.classroom_id)} · Coef. {assessment.coefficient}</p>
          </div>
        </div>

        <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">
              Saisie des {qualitatif ? 'appréciations' : 'notes'}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={savingGrades} onClick={() => handleSetStatus('valide')} className="gap-1.5 rounded-xl active:scale-95 transition-all">
                <CheckCircle className="h-4 w-4" /> <span className="hidden sm:inline">Valider</span>
              </Button>
              <Button size="sm" disabled={savingGrades} onClick={() => handleSetStatus('publie')} className="gap-1.5 rounded-xl active:scale-95 transition-all">
                <Send className="h-4 w-4" /> <span className="hidden sm:inline">Publier</span>
              </Button>
            </div>
          </div>

          {gradesError && (
            <div className="mb-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
              {gradesError}
            </div>
          )}

          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
            {classStudents.map((s, idx) => {
              const value = gradeValues[s.id] || '';
              const numValue = parseFloat(value);
              const isValid = value !== '' && !isNaN(numValue) && numValue >= 0 && numValue <= 20;
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground font-mono w-6 shrink-0 hidden sm:block">{idx + 1}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-info/10 text-primary text-sm font-semibold shrink-0">
                    {s.prenom[0]}{s.nom[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.prenom} {s.nom}</p>
                    <p className="text-xs text-muted-foreground truncate hidden sm:block">{s.matricule}</p>
                  </div>
                  {qualitatif ? (
                    <textarea
                      value={value}
                      onChange={e => setGradeValues(prev => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="Appréciation..."
                      rows={1}
                      className="flex-1 min-w-0 max-w-[240px] rounded-xl border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all resize-none"
                    />
                  ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={value}
                      onChange={e => setGradeValues(prev => ({ ...prev, [s.id]: e.target.value }))}
                      className={cn(
                        'w-16 sm:w-20 text-center font-semibold rounded-xl',
                        value && !isValid && 'border-destructive',
                        isValid && numValue >= 10 && 'border-success',
                        isValid && numValue < 10 && 'border-destructive'
                      )}
                      placeholder="—"
                    />
                    <span className="text-sm text-muted-foreground hidden sm:inline">/20</span>
                  </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {Object.keys(gradeValues).length}/{classStudents.length} élèves notés
            </p>
            <Button onClick={handleSaveGrades} disabled={savingGrades} className="gap-1.5 rounded-xl active:scale-95 transition-all">
              {savingGrades ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">Enregistrer</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ===== BULLETIN VIEW =====
  if (view === 'bulletin' && bulletinStudentId) {
    const student = students.find(s => s.id === bulletinStudentId);
    if (!student) return null;
    const studentGrades = grades.filter(g => g.student_id === student.id);

    // Group grades by subject
    const gradesBySubject: Record<string, { grades: typeof studentGrades; total: number; count: number; coef: number }> = {};
    studentGrades.forEach(g => {
      const assessment = assessments.find(a => a.id === g.assessment_id);
      if (!assessment || g.note === null) return;
      if (!gradesBySubject[assessment.subject_id]) {
        const subject = subjects.find(s => s.id === assessment.subject_id);
        gradesBySubject[assessment.subject_id] = { grades: [], total: 0, count: 0, coef: subject?.coefficient || 1 };
      }
      gradesBySubject[assessment.subject_id].grades.push(g);
      gradesBySubject[assessment.subject_id].total += g.note * assessment.coefficient;
      gradesBySubject[assessment.subject_id].count += assessment.coefficient;
    });

    let totalPoints = 0;
    let totalCoefs = 0;
    Object.entries(gradesBySubject).forEach(([, data]) => {
      const avg = data.count > 0 ? data.total / data.count : 0;
      totalPoints += avg * data.coef;
      totalCoefs += data.coef;
    });
    const generalAvg = totalCoefs > 0 ? (totalPoints / totalCoefs).toFixed(2) : '—';

    return (
      <div className="space-y-5 sm:space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl active:scale-95 transition-all" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour</span>
          </Button>
          <Button className="gap-1.5 rounded-xl active:scale-95 transition-all">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exporter PDF</span><span className="sm:hidden">PDF</span>
          </Button>
        </div>

        {/* Bulletin */}
        <Card className="p-6 sm:p-8 rounded-2xl shadow-card">
          {/* Header */}
          <div className="text-center mb-6 pb-6 border-b-2 border-border">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground font-bold text-xl shadow-card">
                K
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-foreground truncate">École Mixte Lumumba</p>
                <p className="text-xs text-muted-foreground hidden sm:block">Av. de la Justice, Kinshasa</p>
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground mt-4">BULLETIN DE NOTES</h2>
            <p className="text-sm text-muted-foreground">— Année Académique 2026-2027</p>
          </div>

          {/* Student info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-muted-foreground">Nom</p>
              <p className="text-sm font-medium text-foreground truncate">{student.nom}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prénom</p>
              <p className="text-sm font-medium text-foreground truncate">{student.prenom}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Matricule</p>
              <p className="text-sm font-medium text-foreground font-mono truncate">{student.matricule}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Classe</p>
              <p className="text-sm font-medium text-foreground truncate">{getClassroomName(student.classroom_id || '')}</p>
            </div>
          </div>

          {/* Grades table */}
          <div className="overflow-x-auto scrollbar-thin mb-6">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-y border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-3 py-2.5">Matière</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-3 py-2.5">Coef.</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-3 py-2.5">Évaluations</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-3 py-2.5">Moyenne</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-3 py-2.5">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(gradesBySubject).map(([subjectId, data]) => {
                  const avg = data.count > 0 ? (data.total / data.count).toFixed(2) : '—';
                  const points = data.count > 0 ? (parseFloat(avg) * data.coef).toFixed(2) : '—';
                  return (
                    <tr key={subjectId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 text-sm font-medium text-foreground truncate max-w-[140px]">{getSubjectName(subjectId)}</td>
                      <td className="px-3 py-2.5 text-sm text-center text-muted-foreground">{data.coef}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        <p className="truncate-2">
                          {data.grades.map(g => {
                            const a = assessments.find(a => a.id === g.assessment_id);
                            return a ? `${a.libelle}: ${g.note}/20` : '';
                          }).join(' · ')}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('text-sm font-bold', parseFloat(avg) >= 10 ? 'text-success' : 'text-destructive')}>
                          {avg}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-sm text-foreground">{points}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-primary/5">
                  <td colSpan={3} className="px-3 py-3 text-sm font-bold text-foreground text-right">Moyenne générale:</td>
                  <td className="px-3 py-3 text-center">
                    <span className={cn('text-lg font-bold', parseFloat(generalAvg) >= 10 ? 'text-success' : 'text-destructive')}>
                      {generalAvg}
                    </span>
                    <span className="text-sm text-muted-foreground">/20</span>
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-bold text-foreground">—</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Appreciation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Appréciation du conseil de classe</p>
              <p className="text-sm text-foreground italic truncate-2">
                {parseFloat(generalAvg) >= 14 ? 'Très bon trimestre. Continuez ainsi!' :
                 parseFloat(generalAvg) >= 10 ? 'Trimestre satisfaisant. Des efforts à fournir.' :
                 'Trimestre insuffisant. Un travail plus régulier est nécessaire.'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rang</p>
              <p className="text-sm text-foreground">5ème / 8 élèves</p>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-8">Le Directeur</p>
              <div className="border-t border-border pt-1">
                <p className="text-xs text-muted-foreground hidden sm:block">Signature et cachet</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-8">Le Professeur principal</p>
              <div className="border-t border-border pt-1">
                <p className="text-xs text-muted-foreground hidden sm:block">Signature</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-8">Les Parents</p>
              <div className="border-t border-border pt-1">
                <p className="text-xs text-muted-foreground hidden sm:block">Signature</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
