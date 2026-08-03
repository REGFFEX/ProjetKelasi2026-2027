'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, School, Users, MapPin, GraduationCap, BookOpen, Pencil, Trash2, Loader2 } from 'lucide-react';
import { fetchClassrooms, fetchStudents, fetchTeachers, fetchSubjects } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tab = 'classes' | 'subjects';

export function ClassesContent() {
  const [tab, setTab] = useState<Tab>('classes');
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [teachers, setTeachers] = useState<Awaited<ReturnType<typeof fetchTeachers>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, s, t, sub] = await Promise.all([
          fetchClassrooms(),
          fetchStudents(),
          fetchTeachers(),
          fetchSubjects(),
        ]);
        if (cancelled) return;
        setClassrooms(c);
        setStudents(s);
        setTeachers(t);
        setSubjects(sub);
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Classes & Matières</h1>
          <p className="text-muted-foreground mt-1">Gérez les classes, salles et matières de l'établissement</p>
        </div>
        <Button className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{tab === 'classes' ? 'Nouvelle classe' : 'Nouvelle matière'}</span>
        </Button>
      </div>

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
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl active:scale-95 transition-transform">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl text-destructive active:scale-95 transition-transform">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground truncate">{c.nom}</h3>
                <Badge variant="secondary" className="badge-modern mt-1">{c.niveau}</Badge>

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
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl active:scale-95 transition-transform">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl text-destructive active:scale-95 transition-transform">
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
