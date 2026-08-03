'use client';

import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Plus, Eye, CheckCircle, Clock, FileText, Download, Send, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { fetchAssessments, fetchSubjects, fetchClassrooms, fetchStudents, fetchGrades } from '@/lib/api';
import type { GradeStatus } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const statusConfig: Record<GradeStatus, { label: string; icon: typeof CheckCircle; color: string; bg: string; dot: string }> = {
  brouillon: { label: 'Brouillon', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
  valide: { label: 'Validé', icon: CheckCircle, color: 'text-info', bg: 'bg-info/10', dot: 'bg-info' },
  publie: { label: 'Publié', icon: Send, color: 'text-success', bg: 'bg-success/10', dot: 'bg-success' },
};

type View = 'list' | 'entry' | 'bulletin';

export function GradesContent() {
  const [view, setView] = useState<View>('list');
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [bulletinStudentId, setBulletinStudentId] = useState<string | null>(null);
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof fetchAssessments>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof fetchGrades>>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, s, c, st, g] = await Promise.all([
          fetchAssessments(),
          fetchSubjects(),
          fetchClassrooms(),
          fetchStudents(),
          fetchGrades(),
        ]);
        if (cancelled) return;
        setAssessments(a);
        setSubjects(s);
        setClassrooms(c);
        setStudents(st);
        setGrades(g);
      } catch (e) {
        console.error('Failed to load grades data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.nom || 'Inconnu';
  const getClassroomName = (id: string) => classrooms.find(c => c.id === id)?.nom || 'Inconnu';

  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      const matchClass = selectedClassroom === 'all' || a.classroom_id === selectedClassroom;
      const matchSubject = selectedSubject === 'all' || a.subject_id === selectedSubject;
      return matchClass && matchSubject;
    });
  }, [assessments, selectedClassroom, selectedSubject]);

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
          <Button className="gap-1.5 rounded-xl shrink-0 active:scale-95 transition-all">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle évaluation</span><span className="sm:hidden">Évaluation</span>
          </Button>
        </div>

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
            {subjects.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
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
            const avg = assessmentGrades.length > 0
              ? (assessmentGrades.reduce((sum, g) => sum + g.note, 0) / assessmentGrades.length).toFixed(1)
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
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-xl active:scale-95 transition-all" onClick={() => handleEnterGrades(a.id)}>
                      <FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Saisir</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg active:scale-95 transition-all">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bulletin generator */}
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
      </div>
    );
  }

  // ===== GRADE ENTRY VIEW =====
  if (view === 'entry' && selectedAssessment) {
    const assessment = assessments.find(a => a.id === selectedAssessment);
    if (!assessment) return null;
    const classStudents = students.filter(s => s.classroom_id === assessment.classroom_id);

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
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Saisie des notes</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl active:scale-95 transition-all">
                <CheckCircle className="h-4 w-4" /> <span className="hidden sm:inline">Valider</span>
              </Button>
              <Button size="sm" className="gap-1.5 rounded-xl active:scale-95 transition-all">
                <Send className="h-4 w-4" /> <span className="hidden sm:inline">Publier</span>
              </Button>
            </div>
          </div>

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
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {Object.keys(gradeValues).length}/{classStudents.length} élèves notés
            </p>
            <Button className="gap-1.5 rounded-xl active:scale-95 transition-all">
              <Save className="h-4 w-4" /> <span className="hidden sm:inline">Enregistrer</span>
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
      if (!assessment) return;
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
