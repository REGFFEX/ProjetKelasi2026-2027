'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Check, X, Clock, FileText, Save, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { fetchStudents, fetchClassrooms, fetchAttendance, fetchParents, fetchAllStudentParents } from '@/lib/api';
import type { AttendanceStatus } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const statusConfig: Record<AttendanceStatus, { label: string; icon: typeof Check; color: string; bg: string; activeBg: string; activeText: string }> = {
  present: { label: 'Présent', icon: Check, color: 'text-success', bg: 'bg-success/10', activeBg: 'bg-success', activeText: 'text-white' },
  absent: { label: 'Absent', icon: X, color: 'text-destructive', bg: 'bg-destructive/10', activeBg: 'bg-destructive', activeText: 'text-white' },
  retard: { label: 'Retard', icon: Clock, color: 'text-warning', bg: 'bg-warning/10', activeBg: 'bg-warning', activeText: 'text-white' },
  justifie: { label: 'Justifié', icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted', activeBg: 'bg-slate-500', activeText: 'text-white' },
};

const statuses: AttendanceStatus[] = ['present', 'absent', 'retard', 'justifie'];

export function AttendanceContent() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [parents, setParents] = useState<Awaited<ReturnType<typeof fetchParents>>>([]);
  const [studentParents, setStudentParents] = useState<{ id: string; school_id: string; student_id: string; parent_id: string }[]>([]);
  const [existingAttendance, setExistingAttendance] = useState<Awaited<ReturnType<typeof fetchAttendance>>>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, c, p, sp, att] = await Promise.all([
          fetchStudents(),
          fetchClassrooms(),
          fetchParents(),
          fetchAllStudentParents(),
          fetchAttendance(),
        ]);
        if (cancelled) return;
        setStudents(s);
        setClassrooms(c);
        setParents(p);
        setStudentParents(sp);
        setExistingAttendance(att);
        if (c.length > 0) setSelectedClass(c[0].id);
        // Initialize attendance state from fetched data
        const state: Record<string, AttendanceStatus> = {};
        att.forEach(a => {
          state[a.student_id] = a.statut as AttendanceStatus;
        });
        setAttendanceState(state);
      } catch (e) {
        console.error('Failed to load attendance data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const classStudents = useMemo(() => {
    return students.filter(s => s.classroom_id === selectedClass);
  }, [students, selectedClass]);

  const getParentNames = (studentId: string): string[] => {
    const parentIds = studentParents
      .filter(sp => sp.student_id === studentId)
      .map(sp => sp.parent_id);
    return parentIds
      .map(pid => parents.find(p => p.id === pid)?.nom || 'Inconnu')
      .filter(Boolean);
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const markAllPresent = () => {
    const newState: Record<string, AttendanceStatus> = { ...attendanceState };
    classStudents.forEach(s => { newState[s.id] = 'present'; });
    setAttendanceState(newState);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, retard: 0, justifie: 0 };
    classStudents.forEach(s => {
      const status = attendanceState[s.id];
      if (status) counts[status]++;
    });
    return counts;
  }, [classStudents, attendanceState]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Appel quotidien</h1>
          <p className="text-sm text-muted-foreground mt-1">Marquez la présence de chaque élève</p>
        </div>
        <Button onClick={handleSave} className="gap-1.5 self-start active:scale-95 transition-transform">
          <Save className="h-4 w-4" /> {saved ? 'Enregistré!' : 'Enregistrer l\'appel'}
        </Button>
      </div>

      {/* Class selector + date */}
      <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors w-full sm:w-auto"
          >
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl active:scale-95 transition-transform">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"
            />
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl active:scale-95 transition-transform">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={markAllPresent} className="gap-1.5 rounded-xl active:scale-95 transition-transform sm:ml-auto">
            <Check className="h-4 w-4" /> Tous présents
          </Button>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {statuses.map(s => {
          const cfg = statusConfig[s];
          const Icon = cfg.icon;
          return (
            <Card key={s} className="p-2.5 sm:p-3 text-center rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <div className={cn('mx-auto flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl mb-1.5', cfg.bg)}>
                <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', cfg.color)} />
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground">{summary[s]}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{cfg.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Student list — scrolls naturally with the page */}
      <div className="space-y-3 sm:space-y-4">
        {classStudents.map((s, idx) => {
          const currentStatus = attendanceState[s.id] || 'present';
          const parentNames = getParentNames(s.id);
          return (
            <Card key={s.id} className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">{idx + 1}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-info/10 text-primary text-sm font-semibold shrink-0">
                    {s.prenom[0]}{s.nom[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.prenom} {s.nom}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.matricule} · Parent: {parentNames.join(', ') || '—'}</p>
                  </div>
                </div>

                {/* Status buttons — grid on mobile, flex on larger screens */}
                <div className="grid grid-cols-4 gap-1 sm:flex sm:gap-2">
                  {statuses.map(status => {
                    const cfg = statusConfig[status];
                    const Icon = cfg.icon;
                    const isActive = currentStatus === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setStatus(s.id, status)}
                        className={cn(
                          'flex items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium transition-all active:scale-95',
                          isActive
                            ? `${cfg.activeBg} ${cfg.activeText} shadow-sm`
                            : `${cfg.bg} ${cfg.color} hover:opacity-80`
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {classStudents.length === 0 && (
        <div className="text-center py-16">
          <CheckSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun élève dans cette classe</p>
        </div>
      )}
    </div>
  );
}
