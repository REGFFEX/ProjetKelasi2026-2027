'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays, Clock, MapPin, Play, Square, ClipboardList, CheckSquare,
  AlertCircle, ArrowRight, Loader2,
} from 'lucide-react';
import {
  fetchTimetable, fetchAssignments, fetchClassrooms, fetchSubjects, fetchCycles, fetchLevels,
  fetchTeachingSessions, startTeachingSession, endTeachingSession,
  fetchAssessments, fetchGrades, fetchStudents, fetchAttendance,
  type Weekday,
} from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DAYS: { id: Weekday; label: string }[] = [
  { id: 'lundi', label: 'Lundi' },
  { id: 'mardi', label: 'Mardi' },
  { id: 'mercredi', label: 'Mercredi' },
  { id: 'jeudi', label: 'Jeudi' },
  { id: 'vendredi', label: 'Vendredi' },
  { id: 'samedi', label: 'Samedi' },
];

const TODAY_WEEKDAY: Weekday | null = (() => {
  const map: Record<number, Weekday> = { 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi' };
  return map[new Date().getDay()] ?? null;
})();

export function TeacherHomeContent() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof fetchTimetable>>>([]);
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof fetchAssignments>>>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);
  const [cycles, setCycles] = useState<Awaited<ReturnType<typeof fetchCycles>>>([]);
  const [levels, setLevels] = useState<Awaited<ReturnType<typeof fetchLevels>>>([]);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchTeachingSessions>>>([]);
  const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof fetchAssessments>>>([]);
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof fetchGrades>>>([]);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [attendanceToday, setAttendanceToday] = useState<Awaited<ReturnType<typeof fetchAttendance>>>([]);
  const [sessionActionFor, setSessionActionFor] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState('');

  const load = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [s, a, c, sub, cyc, lvl, sess, assess, gr, st, att] = await Promise.all([
        fetchTimetable(), fetchAssignments(), fetchClassrooms(), fetchSubjects(),
        fetchCycles(), fetchLevels(), fetchTeachingSessions(),
        fetchAssessments(), fetchGrades(), fetchStudents(), fetchAttendance({ date: today }),
      ]);
      setSlots(s); setAssignments(a); setClassrooms(c); setSubjects(sub);
      setCycles(cyc); setLevels(lvl); setSessions(sess);
      setAssessments(assess); setGrades(gr); setStudents(st); setAttendanceToday(att);
    } catch (e) {
      console.error('Failed to load teacher home data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getAssignment = (id: string) => assignments.find(a => a.id === id);
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.nom || 'Matière';
  const getClassroomName = (id: string) => classrooms.find(c => c.id === id)?.nom || 'Classe';

  const isHourlyPaidClassroom = (classroomId: string | undefined) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    const level = classroom ? levels.find(l => l.id === classroom.level_id) : undefined;
    const cycle = level ? cycles.find(cy => cy.id === level.cycle_id) : undefined;
    return Boolean(cycle?.paiement_horaire);
  };

  const todaySlots = useMemo(() => {
    return slots
      .filter(s => s.jour === TODAY_WEEKDAY)
      .map(slot => {
        const assignment = getAssignment(slot.assignment_id);
        const classroomId = assignment?.classroom_id;
        const activeSession = sessions.find(s => s.timetable_slot_id === slot.id && s.statut === 'en_cours');
        const attendanceDone = attendanceToday.some(a => a.classroom_id === classroomId);
        return {
          ...slot,
          subjectName: assignment ? getSubjectName(assignment.subject_id) : 'Matière',
          classroomName: classroomId ? getClassroomName(classroomId) : 'Classe',
          classroomId,
          hourlyPaid: isHourlyPaidClassroom(classroomId),
          activeSession,
          attendanceDone,
        };
      })
      .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
  }, [slots, assignments, classrooms, levels, cycles, sessions, attendanceToday]);

  const upcomingSlots = useMemo(() => {
    const todayIndex = DAYS.findIndex(d => d.id === TODAY_WEEKDAY);
    return slots
      .filter(s => s.jour !== TODAY_WEEKDAY)
      .map(slot => {
        const assignment = getAssignment(slot.assignment_id);
        return {
          ...slot,
          subjectName: assignment ? getSubjectName(assignment.subject_id) : 'Matière',
          classroomName: assignment ? getClassroomName(assignment.classroom_id) : 'Classe',
        };
      })
      .sort((a, b) => {
        const dayDiff = DAYS.findIndex(d => d.id === a.jour) - DAYS.findIndex(d => d.id === b.jour);
        const wrap = (i: number) => (todayIndex < 0 ? i : (i - todayIndex + DAYS.length) % DAYS.length);
        const wrappedDiff = wrap(DAYS.findIndex(d => d.id === a.jour)) - wrap(DAYS.findIndex(d => d.id === b.jour));
        return wrappedDiff !== 0 ? wrappedDiff : a.heure_debut.localeCompare(b.heure_debut) || dayDiff;
      })
      .slice(0, 5);
  }, [slots, assignments, classrooms]);

  const pendingAssessments = useMemo(() => {
    return assessments
      .map(a => {
        const classroomStudentCount = students.filter(s => s.classroom_id === a.classroom_id).length;
        const assessmentGrades = grades.filter(g => g.assessment_id === a.id);
        const gradedCount = assessmentGrades.filter(g => g.note !== null).length;
        const hasDraft = assessmentGrades.some(g => g.statut_validation === 'brouillon');
        const incomplete = classroomStudentCount > 0 && gradedCount < classroomStudentCount;
        return {
          ...a,
          subjectName: getSubjectName(a.subject_id),
          classroomName: getClassroomName(a.classroom_id),
          gradedCount, classroomStudentCount, incomplete, hasDraft,
        };
      })
      .filter(a => a.incomplete || a.hasDraft)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [assessments, grades, students, subjects, classrooms]);

  const classesWithoutAttendanceToday = todaySlots.filter(s => !s.attendanceDone && s.classroomId);

  const handleStartSession = async (slotId: string) => {
    setSessionActionFor(slotId);
    setSessionError('');
    try {
      const session = await startTeachingSession(slotId);
      setSessions(prev => [...prev, session]);
    } catch (err) {
      setSessionError(err instanceof ApiError ? err.message : 'Échec du démarrage du cours.');
    } finally {
      setSessionActionFor(null);
    }
  };

  const handleEndSession = async (sessionId: string, slotId: string) => {
    setSessionActionFor(slotId);
    setSessionError('');
    try {
      const updated = await endTeachingSession(sessionId);
      setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setSessionError(err instanceof ApiError ? err.message : 'Échec de la fin du cours.');
    } finally {
      setSessionActionFor(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = profile?.nom?.split(' ')[0] ?? '';
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bonjour{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-muted-foreground mt-1 capitalize">{todayLabel}</p>
      </div>

      {sessionError && (
        <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">{sessionError}</div>
      )}

      {classesWithoutAttendanceToday.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl bg-warning/10 px-3.5 py-3 text-sm text-warning">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Présences non enregistrées aujourd'hui pour {classesWithoutAttendanceToday.map(s => s.classroomName).join(', ')}.
            {' '}<Link href="/attendance" className="underline font-medium">Faire l'appel</Link>
          </span>
        </div>
      )}

      <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
        <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" /> Aujourd'hui
        </h3>
        {todaySlots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun cours prévu aujourd'hui.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {todaySlots.map(slot => (
              <div key={slot.id} className="rounded-xl border border-border p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{slot.subjectName}</p>
                    <p className="text-xs text-muted-foreground truncate">{slot.classroomName}</p>
                  </div>
                  {slot.attendanceDone && (
                    <span className="inline-flex items-center gap-1 text-xs text-success shrink-0">
                      <CheckSquare className="h-3.5 w-3.5" /> Présences faites
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {slot.heure_debut.slice(0, 5)}–{slot.heure_fin.slice(0, 5)}</span>
                  {slot.salle && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {slot.salle}</span>}
                </div>
                {slot.hourlyPaid && (
                  <div className="mt-2.5 pt-2.5 border-t border-border">
                    {slot.activeSession ? (
                      <Button
                        size="sm" variant="outline" className="w-full gap-1.5 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                        disabled={sessionActionFor === slot.id}
                        onClick={() => handleEndSession(slot.activeSession!.id, slot.id)}
                      >
                        {sessionActionFor === slot.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                        Terminer le cours
                      </Button>
                    ) : (
                      <Button
                        size="sm" className="w-full gap-1.5 rounded-xl"
                        disabled={sessionActionFor === slot.id}
                        onClick={() => handleStartSession(slot.id)}
                      >
                        {sessionActionFor === slot.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        Démarrer le cours
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-warning" /> À traiter
            </h3>
            <Link href="/grades" className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
              Notes <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {pendingAssessments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune évaluation en attente.</p>
          ) : (
            <div className="divide-y divide-border mt-2">
              {pendingAssessments.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.libelle}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.subjectName} · {a.classroomName}</p>
                  </div>
                  <span className={cn(
                    'badge-modern text-xs shrink-0',
                    a.incomplete ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                  )}>
                    {a.incomplete ? `${a.gradedCount}/${a.classroomStudentCount} notées` : 'À publier'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-info" /> Cette semaine
            </h3>
            <Link href="/timetable" className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
              Horaires <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun autre cours prévu cette semaine.</p>
          ) : (
            <div className="divide-y divide-border mt-2">
              {upcomingSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{slot.subjectName}</p>
                    <p className="text-xs text-muted-foreground truncate">{slot.classroomName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {DAYS.find(d => d.id === slot.jour)?.label} {slot.heure_debut.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
