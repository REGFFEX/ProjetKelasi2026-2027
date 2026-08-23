'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  fetchMyChildren,
  fetchClassrooms,
  fetchChildInvoices,
  fetchChildGrades,
  fetchChildAssessments,
  fetchSubjects,
  fetchTerms,
  downloadChildBulletin,
  formatMoney,
  type DbStudent,
  type DbClassroom,
} from '@/lib/api';

function useChildren() {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<DbStudent[]>([]);
  const [classrooms, setClassrooms] = useState<DbClassroom[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, cls] = await Promise.all([fetchMyChildren(), fetchClassrooms()]);
        if (cancelled) return;
        setChildren(c);
        setClassrooms(cls);
      } catch (e) {
        if (!cancelled) setError('Impossible de charger vos enfants.');
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const classroomName = (id: string | null) => classrooms.find(c => c.id === id)?.nom || 'Classe non assignée';

  return { loading, children, classrooms, classroomName, error };
}

export function ParentOverviewContent() {
  const { loading, children, classroomName, error } = useChildren();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-sm">
        <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          Bienvenue
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Espace parent</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Consultez l'état de vos enfants, leurs notes, présences et paiements.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {children.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">Aucun enfant n'est associé à votre compte pour le moment.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {children.map(child => (
          <Card key={child.id} className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-info/10 text-primary font-semibold">
                {child.prenom[0]}{child.nom[0]}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{child.prenom} {child.nom}</p>
                <p className="text-xs text-muted-foreground truncate">{classroomName(child.classroom_id)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title: 'Mes enfants', description: 'Informations et classes de vos enfants.', href: '/parent/students', icon: GraduationCap },
          { title: 'Paiements', description: 'Factures, paiements et soldes à jour.', href: '/parent/payments', icon: Wallet },
          { title: 'Bulletins', description: 'Notes et moyennes par enfant.', href: '/parent/bulletins', icon: FileText },
          { title: 'Annonces', description: "Messages et annonces de l'école.", href: '/communication', icon: MessageSquare },
        ].map(item => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ParentStudentsContent() {
  const { loading, children, classroomName, error } = useChildren();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mes enfants</h1>
        <p className="text-sm text-muted-foreground mt-1">Informations de vos enfants.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {children.map(child => (
          <Card key={child.id} className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-info/10 text-primary font-semibold">
                {child.prenom[0]}{child.nom[0]}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{child.prenom} {child.nom}</p>
                <p className="text-xs text-muted-foreground truncate">{classroomName(child.classroom_id)}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Matricule</dt>
                <dd className="font-mono text-foreground">{child.matricule}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Naissance</dt>
                <dd className="text-foreground">{new Date(child.date_naissance).toLocaleDateString('fr-FR')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Statut</dt>
                <dd>
                  <Badge variant={child.statut === 'actif' ? 'secondary' : 'outline'} className="badge-modern">
                    {child.statut === 'actif' ? 'Actif' : 'Inactif'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ParentPaymentsContent() {
  const { loading, children, classroomName, error } = useChildren();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Awaited<ReturnType<typeof fetchChildInvoices>>>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    if (!loading && children.length > 0 && !selectedId) setSelectedId(children[0].id);
  }, [loading, children, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoadingInvoices(true);
    fetchChildInvoices(selectedId)
      .then(rows => { if (!cancelled) setInvoices(rows); })
      .catch(e => console.error(e))
      .finally(() => { if (!cancelled) setLoadingInvoices(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusLabel: Record<string, { label: string; color: string }> = {
    paye: { label: 'Payé', color: 'text-success bg-success/10' },
    partiel: { label: 'Partiel', color: 'text-warning bg-warning/10' },
    impaye: { label: 'Impayé', color: 'text-destructive bg-destructive/10' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paiements</h1>
        <p className="text-sm text-muted-foreground mt-1">Factures et soldes par enfant.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedId(child.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors',
                selectedId === child.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              )}
            >
              {child.prenom} {child.nom}
            </button>
          ))}
        </div>
      )}

      {loadingInvoices ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>}
          {invoices.map(inv => {
            const cfg = statusLabel[inv.statut] || statusLabel.impaye;
            return (
              <Card key={inv.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground capitalize truncate">{inv.type_frais}</p>
                    <p className="text-xs text-muted-foreground">{new Date(inv.date_emission).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className={cn('badge-modern text-xs shrink-0', cfg.color)}>{cfg.label}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold text-foreground">{formatMoney(inv.montant_total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payé</p>
                    <p className="font-semibold text-success">{formatMoney(inv.montant_paye)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reste</p>
                    <p className="font-semibold text-destructive">{formatMoney(inv.reste_a_payer)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {selectedId ? `Classe : ${classroomName(children.find(c => c.id === selectedId)?.classroom_id ?? null)}` : ''}
      </p>
    </div>
  );
}

export function ParentBulletinsContent() {
  const { loading, children, error } = useChildren();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && children.length > 0 && !selectedId) setSelectedId(children[0].id);
  }, [loading, children, selectedId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bulletins</h1>
        <p className="text-sm text-muted-foreground mt-1">Notes et moyennes par enfant.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedId(child.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors',
                selectedId === child.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              )}
            >
              {child.prenom} {child.nom}
            </button>
          ))}
        </div>
      )}

      {selectedId && (() => {
        const child = children.find(c => c.id === selectedId);
        return child ? <ChildBulletin student={child} /> : null;
      })()}
    </div>
  );
}

function ChildBulletin({ student }: { student: DbStudent }) {
  const studentId = student.id;
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof fetchChildGrades>>>([]);
  const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof fetchChildAssessments>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);
  const [terms, setTerms] = useState<Awaited<ReturnType<typeof fetchTerms>>>([]);
  const [termId, setTermId] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [g, a, s, t] = await Promise.all([
          fetchChildGrades(studentId),
          fetchChildAssessments(studentId),
          fetchSubjects(),
          fetchTerms(),
        ]);
        if (cancelled) return;
        setGrades(g);
        setAssessments(a);
        setSubjects(s);
        setTerms(t);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadChildBulletin(studentId, student.matricule, termId || undefined);
    } catch (e) {
      console.error('Failed to download bulletin:', e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const gradesBySubject: Record<string, { total: number; count: number; coef: number; rows: { libelle: string; note: number }[] }> = {};
  grades.forEach(g => {
    if (g.note === null) return;
    const assessment = assessments.find(a => a.id === g.assessment_id);
    if (!assessment) return;
    if (!gradesBySubject[assessment.subject_id]) {
      const subject = subjects.find(s => s.id === assessment.subject_id);
      gradesBySubject[assessment.subject_id] = { total: 0, count: 0, coef: subject?.coefficient || 1, rows: [] };
    }
    gradesBySubject[assessment.subject_id].total += g.note * assessment.coefficient;
    gradesBySubject[assessment.subject_id].count += assessment.coefficient;
    gradesBySubject[assessment.subject_id].rows.push({ libelle: assessment.libelle, note: g.note });
  });

  let totalPoints = 0;
  let totalCoefs = 0;
  Object.values(gradesBySubject).forEach(data => {
    const avg = data.count > 0 ? data.total / data.count : 0;
    totalPoints += avg * data.coef;
    totalCoefs += data.coef;
  });
  const generalAvg = totalCoefs > 0 ? (totalPoints / totalCoefs).toFixed(2) : null;

  const subjectEntries = Object.entries(gradesBySubject);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-border">
        <select
          value={termId}
          onChange={e => setTermId(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">Toutes les périodes</option>
          {terms.map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading} className="gap-1.5 rounded-xl">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Télécharger en PDF
        </Button>
      </div>
      {subjectEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune note disponible pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {subjectEntries.map(([subjectId, data]) => {
            const subject = subjects.find(s => s.id === subjectId);
            const avg = data.count > 0 ? (data.total / data.count).toFixed(2) : '—';
            return (
              <div key={subjectId} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{subject?.nom || 'Matière'}</p>
                  <p className="text-xs text-muted-foreground">Coef. {data.coef} · {data.rows.length} évaluation(s)</p>
                </div>
                <span className={cn('text-lg font-bold', parseFloat(avg) >= 10 ? 'text-success' : 'text-destructive')}>
                  {avg}<span className="text-xs text-muted-foreground">/20</span>
                </span>
              </div>
            );
          })}
          {generalAvg && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm font-bold text-foreground">Moyenne générale</p>
              <span className={cn('text-xl font-bold', parseFloat(generalAvg) >= 10 ? 'text-success' : 'text-destructive')}>
                {generalAvg}<span className="text-sm text-muted-foreground">/20</span>
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
