'use client';

import { useState, useEffect } from 'react';
import { Plus, Mail, Phone, BookOpen, School, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { fetchTeachers, fetchSubjects, fetchClassrooms } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function TeachersContent() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Awaited<ReturnType<typeof fetchTeachers>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);

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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Enseignants</h1>
          <p className="text-muted-foreground mt-1">{teachers.length} enseignant(s) — {teachers.filter(t => t.statut === 'actif').length} actifs</p>
        </div>
        <Button className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvel enseignant</span>
        </Button>
      </div>

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
                <span className={cn(
                  'badge-modern inline-flex items-center gap-1 mt-1 text-xs font-medium',
                  t.statut === 'actif' ? 'text-success' : 'text-muted-foreground'
                )}>
                  {t.statut === 'actif' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {t.statut === 'actif' ? 'Actif' : 'Inactif'}
                </span>
              </div>
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
