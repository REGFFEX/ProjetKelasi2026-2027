'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, Download, Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Eye, Pencil, Trash2, GraduationCap, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { fetchStudents, fetchClassrooms, fetchParents, fetchAllStudentParents } from '@/lib/api';

interface StudentRow {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  classroom_id: string | null;
  statut: string;
}

interface ClassroomRow {
  id: string;
  nom: string;
  niveau: string;
}

interface ParentRow {
  id: string;
  nom: string;
}

interface StudentParentRow {
  student_id: string;
  parent_id: string;
}

export function StudentsListContent() {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [studentParents, setStudentParents] = useState<StudentParentRow[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [s, c, p, sp] = await Promise.all([
          fetchStudents(),
          fetchClassrooms(),
          fetchParents(),
          fetchAllStudentParents(),
        ]);
        setStudents(s as StudentRow[]);
        setClassrooms(c as ClassroomRow[]);
        setParents(p as ParentRow[]);
        setStudentParents(sp as unknown as StudentParentRow[]);
      } catch (err) {
        console.error('Students load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getParentNames = (studentId: string): string[] => {
    const parentIds = studentParents.filter(sp => sp.student_id === studentId).map(sp => sp.parent_id);
    return parentIds
      .map(pid => parents.find(p => p.id === pid)?.nom)
      .filter((n): n is string => !!n);
  };

  const filtered = useMemo(() => {
    return students.filter(s => {
      const fullName = `${s.prenom} ${s.nom}`.toLowerCase();
      const matchSearch = fullName.includes(search.toLowerCase()) || s.matricule.toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === 'all' || s.classroom_id === classFilter;
      const matchStatus = statusFilter === 'all' || s.statut === statusFilter;
      return matchSearch && matchClass && matchStatus;
    });
  }, [students, search, classFilter, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Élèves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} élève(s) — {students.length} au total</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
            <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Importer</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exporter</span>
          </Button>
          <Link href="/students/new">
            <Button size="sm" className="gap-1.5 rounded-xl">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvel élève</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou matricule..."
            className="pl-10 rounded-xl"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 rounded-xl shrink-0"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" /> <span className="hidden sm:inline">Filtres</span>
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 animate-fade-in">
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          >
            <option value="all">Toutes les classes</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          >
            <option value="all">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
          </select>
        </div>
      )}

      {/* Table — desktop */}
      <Card className="hidden md:block overflow-hidden shadow-card">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Élève</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Matricule</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Classe</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Parent</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Statut</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => {
                const classroom = classrooms.find(c => c.id === s.classroom_id);
                const parentNames = getParentNames(s.id);
                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-info/10 text-primary text-xs font-semibold shrink-0">
                          {s.prenom[0]}{s.nom[0]}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/students/${s.id}`} className="text-sm font-medium text-foreground hover:text-primary truncate block max-w-[180px]">
                            {s.prenom} {s.nom}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">Né(e) le {new Date(s.date_naissance).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono whitespace-nowrap">{s.matricule}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="rounded-lg">{classroom?.nom || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground truncate max-w-[150px]">{parentNames.join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'badge-modern',
                        s.statut === 'actif' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', s.statut === 'actif' ? 'bg-success' : 'bg-muted-foreground')} />
                        {s.statut === 'actif' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/students/${s.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/students/${s.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map(s => {
          const classroom = classrooms.find(c => c.id === s.classroom_id);
          const parentNames = getParentNames(s.id);
          return (
            <Card key={s.id} className="p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-info/10 text-primary text-sm font-semibold shrink-0">
                  {s.prenom[0]}{s.nom[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/students/${s.id}`}>
                    <p className="text-sm font-medium text-foreground truncate">{s.prenom} {s.nom}</p>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.matricule} · {classroom?.nom}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Parent: {parentNames.join(', ') || '—'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      'badge-modern',
                      s.statut === 'actif' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    )}>
                      {s.statut === 'actif' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
                <Link href={`/students/${s.id}`}>
                  <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun élève trouvé</p>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowImport(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-card shadow-xl animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Importer des élèves</h3>
                  <p className="text-xs text-muted-foreground">Format CSV ou Excel</p>
                </div>
              </div>
              <button onClick={() => setShowImport(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground font-medium">Cliquez pour téléverser ou glissez un fichier</p>
                <p className="text-xs text-muted-foreground mt-1">CSV, XLSX max 5MB</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-medium text-foreground">Colonnes attendues:</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                  <span>· prenom (obligatoire)</span>
                  <span>· nom (obligatoire)</span>
                  <span>· dateNaissance</span>
                  <span>· matricule</span>
                  <span>· classe</span>
                  <span>· parentNom</span>
                  <span>· parentTelephone</span>
                  <span>· parentProfession</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>Les doublons (matricule) seront ignorés</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
                <span>Vérifiez les noms de classe avant l'import</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border p-5">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">Modèle</span>
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowImport(false)} className="rounded-xl">Annuler</Button>
                <Button onClick={() => setShowImport(false)} className="rounded-xl">Importer</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
