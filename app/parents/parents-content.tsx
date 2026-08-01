'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, Phone, Mail, MapPin, Users, Briefcase, Loader2 } from 'lucide-react';
import { fetchParents, fetchStudents, fetchAllStudentParents } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ParentsContent() {
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<Awaited<ReturnType<typeof fetchParents>>>([]);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [studentParents, setStudentParents] = useState<{ id: string; school_id: string; student_id: string; parent_id: string }[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, s, sp] = await Promise.all([
          fetchParents(),
          fetchStudents(),
          fetchAllStudentParents(),
        ]);
        if (cancelled) return;
        setParents(p);
        setStudents(s);
        setStudentParents(sp);
      } catch (e) {
        console.error('Failed to load parents data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return parents.filter(p =>
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.telephone.includes(search)
    );
  }, [search, parents]);

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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Parents</h1>
          <p className="text-muted-foreground mt-1">{parents.length} parent(s) enregistré(s)</p>
        </div>
        <Button className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouveau parent</span>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou téléphone..."
          className="pl-9 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map(p => {
          const childIds = studentParents
            .filter(sp => sp.parent_id === p.id)
            .map(sp => sp.student_id);
          const children = students.filter(s => childIds.includes(s.id));
          return (
            <Card
              key={p.id}
              className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-info/10 text-primary text-sm font-semibold shrink-0">
                  {p.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{p.nom}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    <Briefcase className="h-3 w-3 shrink-0" /> <span className="truncate">{p.profession}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{p.telephone}</span>
                </p>
                {p.email && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{p.email}</span>
                  </p>
                )}
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{p.adresse}</span>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Enfants ({children.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {children.map(c => (
                    <Link
                      key={c.id}
                      href={`/students/${c.id}`}
                      className="badge-modern inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors active:scale-95"
                    >
                      {c.prenom} {c.nom}
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
