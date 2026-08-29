'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, Phone, Mail, MapPin, Users, Briefcase, Loader2, KeyRound } from 'lucide-react';
import { fetchParents, fetchStudents, fetchAllStudentParents, createParent } from '@/lib/api';
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
import { useAuth } from '@/lib/auth-context';
import { canWrite } from '@/lib/permissions';

const emptyParentForm = { nom: '', telephone: '', email: '', adresse: '', profession: '' };

export function ParentsContent() {
  const { profile } = useAuth();
  const canManage = canWrite(profile?.role, 'parents');
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<Awaited<ReturnType<typeof fetchParents>>>([]);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [studentParents, setStudentParents] = useState<{ id: string; school_id: string; student_id: string; parent_id: string }[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyParentForm);
  const [withLogin, setWithLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');

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

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    if (withLogin && (loginPassword.length < 6 || !form.email.trim())) return;
    setCreating(true);
    try {
      const created = await createParent({
        nom: form.nom,
        telephone: form.telephone,
        email: form.email || null,
        adresse: form.adresse,
        profession: form.profession,
        ...(withLogin ? { password: loginPassword } : {}),
      });
      setParents(prev => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)));
      setForm(emptyParentForm);
      setWithLogin(false);
      setLoginPassword('');
      setShowCreate(false);
    } catch (err) {
      console.error('Failed to create parent:', err);
    } finally {
      setCreating(false);
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Parents</h1>
          <p className="text-muted-foreground mt-1">{parents.length} parent(s) enregistré(s)</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouveau parent</span>
          </Button>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau parent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateParent} className="space-y-3">
            <div>
              <Label htmlFor="p-nom">Nom *</Label>
              <Input id="p-nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="p-telephone">Téléphone</Label>
              <Input id="p-telephone" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="p-adresse">Adresse</Label>
              <Input id="p-adresse" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="p-profession">Profession</Label>
              <Input id="p-profession" value={form.profession} onChange={e => setForm({ ...form, profession: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div className="rounded-xl border border-border p-3">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={withLogin} onChange={e => setWithLogin(e.target.checked)} className="rounded border-input" />
                <span className="font-medium text-foreground">Créer un accès de connexion (nécessite un email)</span>
              </label>
              {withLogin && (
                <div className="mt-2.5">
                  <Label htmlFor="p-password">Mot de passe *</Label>
                  <Input id="p-password" type="password" minLength={6} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required={withLogin} className="mt-1.5 rounded-xl" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={creating} className="gap-1.5 rounded-xl">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  {p.user_id && (
                    <span className="badge-modern inline-flex items-center gap-1 mt-1 text-xs font-medium text-primary" title="Compte de connexion actif">
                      <KeyRound className="h-3 w-3" /> Connexion
                    </span>
                  )}
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
