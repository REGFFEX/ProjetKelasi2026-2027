'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fetchClassrooms, fetchParents, fetchStudentById, createStudent, updateStudent } from '@/lib/api';

interface ClassroomRow { id: string; nom: string; niveau: string; }
interface ParentRow { id: string; nom: string; telephone: string; profession: string; }

export function StudentFormContent({ mode, studentId }: { mode: 'create' | 'edit'; studentId?: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    matricule: `EL${Math.floor(1000 + Math.random() * 9000)}`,
    date_naissance: '',
    classroom_id: '',
    statut: 'actif' as 'actif' | 'inactif',
    parentIds: [] as string[],
  });

  useEffect(() => {
    async function load() {
      try {
        const [c, p] = await Promise.all([fetchClassrooms(), fetchParents()]);
        setClassrooms(c as ClassroomRow[]);
        setParents(p as ParentRow[]);

        if (mode === 'edit' && studentId) {
          const s = await fetchStudentById(studentId);
          if (s) {
            setFormData(prev => ({
              ...prev,
              prenom: s.prenom,
              nom: s.nom,
              matricule: s.matricule,
              date_naissance: s.date_naissance,
              classroom_id: s.classroom_id ?? '',
              statut: s.statut as 'actif' | 'inactif',
            }));
          }
        }
      } catch (err) {
        console.error('Form load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mode, studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.school_id) return;
    setSaving(true);
    try {
      const payload = {
        school_id: profile.school_id,
        matricule: formData.matricule,
        nom: formData.nom,
        prenom: formData.prenom,
        date_naissance: formData.date_naissance,
        classroom_id: formData.classroom_id,
        statut: formData.statut,
      };
      if (mode === 'edit' && studentId) {
        await updateStudent(studentId, payload);
      } else {
        await createStudent(payload);
      }
      router.push('/students');
    } catch (err) {
      console.error('Save error:', err);
      setSaving(false);
    }
  };

  const toggleParent = (parentId: string) => {
    setFormData(prev => ({
      ...prev,
      parentIds: prev.parentIds.includes(parentId)
        ? prev.parentIds.filter(id => id !== parentId)
        : [...prev.parentIds, parentId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour</span>
          </Button>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
          {mode === 'create' ? 'Nouvel élève' : 'Modifier l\'élève'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <Card className="p-4 sm:p-6 shadow-card rounded-2xl">
          <h3 className="font-semibold text-foreground mb-4 text-sm sm:text-base">Informations personnelles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="prenom" className="text-sm">Prénom *</Label>
              <Input id="prenom" value={formData.prenom} onChange={e => setFormData({ ...formData, prenom: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="nom" className="text-sm">Nom *</Label>
              <Input id="nom" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="matricule" className="text-sm">Matricule</Label>
              <Input id="matricule" value={formData.matricule} onChange={e => setFormData({ ...formData, matricule: e.target.value })} className="mt-1.5 rounded-xl font-mono" />
            </div>
            <div>
              <Label htmlFor="date_naissance" className="text-sm">Date de naissance *</Label>
              <Input id="date_naissance" type="date" value={formData.date_naissance} onChange={e => setFormData({ ...formData, date_naissance: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 shadow-card rounded-2xl">
          <h3 className="font-semibold text-foreground mb-4 text-sm sm:text-base">Scolarité</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="classroom_id" className="text-sm">Classe *</Label>
              <select id="classroom_id" value={formData.classroom_id} onChange={e => setFormData({ ...formData, classroom_id: e.target.value })} required className="mt-1.5 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all">
                <option value="">Sélectionner une classe</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="statut" className="text-sm">Statut</Label>
              <select id="statut" value={formData.statut} onChange={e => setFormData({ ...formData, statut: e.target.value as 'actif' | 'inactif' })} className="mt-1.5 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all">
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 shadow-card rounded-2xl">
          <h3 className="font-semibold text-foreground mb-4 text-sm sm:text-base">Photo</h3>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-info/10 text-primary text-xl sm:text-2xl font-bold shrink-0">
              {formData.prenom && formData.nom ? `${formData.prenom[0]}${formData.nom[0]}` : '?'}
            </div>
            <div className="min-w-0">
              <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Téléverser une photo</span><span className="sm:hidden">Photo</span>
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG max 2MB</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 shadow-card rounded-2xl">
          <h3 className="font-semibold text-foreground mb-4 text-sm sm:text-base">Parents / Tuteurs</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {parents.map(p => {
              const isSelected = formData.parentIds.includes(p.id);
              return (
                <label key={p.id} className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all', isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:bg-muted/50')}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleParent(p.id)} className="rounded border-input shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.nom}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.telephone} · {p.profession}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/students"><Button type="button" variant="outline" className="rounded-xl">Annuler</Button></Link>
          <Button type="submit" disabled={saving} className="gap-1.5 rounded-xl active:scale-[0.97]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === 'create' ? 'Créer l\'élève' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
