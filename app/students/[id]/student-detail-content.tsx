'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Phone, MapPin, Calendar, FileText, GraduationCap, Wallet, CheckSquare, ClipboardList, Download, Loader2 } from 'lucide-react';
import {
  fetchStudentById,
  fetchStudentParents,
  fetchStudentDocuments,
  fetchClassrooms,
  fetchInvoices,
  fetchPayments,
  fetchAttendance,
  fetchGrades,
  fetchAssessments,
  fetchSubjects,
  fetchTerms,
  downloadStudentBulletin,
  downloadStudentCertificate,
  downloadStudentIdCard,
  formatMoney,
} from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { canWrite, canReadFinancial, canSeeAcademicRecord, canManageStudentDocuments } from '@/lib/permissions';

const attendanceColors: Record<string, string> = {
  present: 'bg-success/10 text-success',
  absent: 'bg-destructive/10 text-destructive',
  retard: 'bg-warning/10 text-warning',
  justifie: 'bg-muted text-muted-foreground',
};

const attendanceLabels: Record<string, string> = {
  present: 'Présent',
  absent: 'Absent',
  retard: 'Retard',
  justifie: 'Justifié',
};

export function StudentDetailContent({ studentId }: { studentId: string }) {
  const { profile } = useAuth();
  const canManage = canWrite(profile?.role, 'students');
  const canSeeFinancial = canReadFinancial(profile?.role);
  const canSeeAcademic = canSeeAcademicRecord(profile?.role);
  const canGenerateDocs = canManageStudentDocuments(profile?.role);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Awaited<ReturnType<typeof fetchStudentById>> | null>(null);
  const [parents, setParents] = useState<Awaited<ReturnType<typeof fetchStudentParents>>>([]);
  const [documents, setDocuments] = useState<{ id: string; nom: string; type: string; date_ajout: string }[]>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [invoices, setInvoices] = useState<Awaited<ReturnType<typeof fetchInvoices>>>([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof fetchPayments>>>([]);
  const [attendance, setAttendance] = useState<Awaited<ReturnType<typeof fetchAttendance>>>([]);
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof fetchGrades>>>([]);
  const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof fetchAssessments>>>([]);
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof fetchSubjects>>>([]);
  const [terms, setTerms] = useState<Awaited<ReturnType<typeof fetchTerms>>>([]);
  const [bulletinTermId, setBulletinTermId] = useState('');
  const [downloadingBulletin, setDownloadingBulletin] = useState(false);
  const [downloadingCertificate, setDownloadingCertificate] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.allSettled([
          fetchStudentById(studentId),
          fetchStudentParents(studentId),
          fetchStudentDocuments(studentId),
          fetchClassrooms(),
          canSeeFinancial ? fetchInvoices() : Promise.resolve([]),
          canSeeFinancial ? fetchPayments() : Promise.resolve([]),
          canSeeAcademic ? fetchAttendance() : Promise.resolve([]),
          canSeeAcademic ? fetchGrades() : Promise.resolve([]),
          canSeeAcademic ? fetchAssessments() : Promise.resolve([]),
          fetchSubjects(),
          fetchTerms(),
        ]);
        if (cancelled) return;
        const [s, p, docs, c, inv, pay, att, g, a, sub, t] = results.map(r => (r.status === 'fulfilled' ? r.value : undefined));
        results.forEach((r, i) => {
          if (r.status === 'rejected') console.error(`Failed to load student detail (index ${i}):`, r.reason);
        });
        if (s) setStudent(s as Awaited<ReturnType<typeof fetchStudentById>>);
        setParents((p as typeof parents) ?? []);
        setDocuments((docs as { id: string; nom: string; type: string; date_ajout: string }[]) ?? []);
        setClassrooms((c as typeof classrooms) ?? []);
        setInvoices((inv as typeof invoices) ?? []);
        setPayments((pay as typeof payments) ?? []);
        setAttendance((att as typeof attendance) ?? []);
        setGrades((g as typeof grades) ?? []);
        setAssessments((a as typeof assessments) ?? []);
        setSubjects((sub as typeof subjects) ?? []);
        setTerms((t as typeof terms) ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId, canSeeFinancial, canSeeAcademic]);

  const handleDownloadBulletin = async () => {
    if (!student) return;
    setDownloadingBulletin(true);
    try {
      await downloadStudentBulletin(student.id, student.matricule, bulletinTermId || undefined);
    } catch (e) {
      console.error('Failed to download bulletin:', e);
    } finally {
      setDownloadingBulletin(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!student) return;
    setDownloadingCertificate(true);
    try {
      await downloadStudentCertificate(student.id, student.matricule);
    } catch (e) {
      console.error('Failed to download certificate:', e);
    } finally {
      setDownloadingCertificate(false);
    }
  };

  const handleDownloadIdCard = async () => {
    if (!student) return;
    setDownloadingCard(true);
    try {
      await downloadStudentIdCard(student.id, student.matricule);
    } catch (e) {
      console.error('Failed to download ID card:', e);
    } finally {
      setDownloadingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) return null;

  const classroom = classrooms.find(c => c.id === student.classroom_id)?.nom || 'Inconnu';
  const studentInvoices = invoices.filter(inv => inv.student_id === student.id);
  const studentPayments = payments.filter(p => studentInvoices.some(inv => inv.id === p.invoice_id));
  const studentAttendance = attendance.filter(a => a.student_id === student.id);
  const studentGrades = grades.filter(g => g.student_id === student.id);
  const notedStudentGrades = studentGrades.filter((g): g is typeof g & { note: number } => g.note !== null);

  const avgGrade = notedStudentGrades.length > 0
    ? (notedStudentGrades.reduce((sum, g) => sum + g.note, 0) / notedStudentGrades.length).toFixed(2)
    : '—';

  const totalPaid = studentInvoices.reduce((sum, inv) => sum + inv.montant_paye, 0);
  const totalDue = studentInvoices.reduce((sum, inv) => sum + inv.reste_a_payer, 0);

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.nom || 'Inconnu';

  const tabs = [
    { id: 'info', label: 'Informations', icon: GraduationCap },
    { id: 'attendance', label: 'Présences', icon: CheckSquare },
    { id: 'grades', label: 'Notes', icon: ClipboardList },
    { id: 'payments', label: 'Paiements', icon: Wallet },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour</span>
          </Button>
        </Link>
      </div>

      {/* Header card */}
      <Card className="p-4 sm:p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-info/10 text-primary text-xl font-bold shrink-0">
            {student.prenom[0]}{student.nom[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{student.prenom} {student.nom}</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
              <span className="text-sm text-muted-foreground font-mono truncate">{student.matricule}</span>
              <Badge variant="secondary" className="badge-modern">{classroom}</Badge>
              <span className={cn(
                'badge-modern',
                student.statut === 'actif' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              )}>
                {student.statut === 'actif' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 truncate">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="truncate">{new Date(student.date_naissance).toLocaleDateString('fr-FR')}</span>
              </span>
            </div>
          </div>
          {canManage && (
            <Link href={`/students/${student.id}/edit`} className="shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Modifier</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-border">
          {canSeeAcademic && (
            <>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Moyenne générale</p>
                <p className="text-lg font-bold text-foreground mt-0.5 truncate">{avgGrade}<span className="text-sm text-muted-foreground">/20</span></p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Présences</p>
                <p className="text-lg font-bold text-foreground mt-0.5 truncate">{studentAttendance.filter(a => a.statut === 'present').length}<span className="text-sm text-muted-foreground">/{studentAttendance.length}</span></p>
              </div>
            </>
          )}
          {canSeeFinancial && (
            <>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total payé</p>
                <p className="text-lg font-bold text-success mt-0.5 truncate">{formatMoney(totalPaid)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Reste à payer</p>
                <p className="text-lg font-bold text-destructive mt-0.5 truncate">{formatMoney(totalDue)}</p>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: tabs content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Info */}
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300">
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Nom</p>
                <p className="text-sm text-foreground mt-0.5 truncate">{student.nom}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Prénom</p>
                <p className="text-sm text-foreground mt-0.5 truncate">{student.prenom}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Date de naissance</p>
                <p className="text-sm text-foreground mt-0.5 truncate">{new Date(student.date_naissance).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Matricule</p>
                <p className="text-sm text-foreground mt-0.5 font-mono truncate">{student.matricule}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Classe</p>
                <p className="text-sm text-foreground mt-0.5 truncate">{classroom}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="text-sm text-foreground mt-0.5 truncate">{student.statut === 'actif' ? 'Actif' : 'Inactif'}</p>
              </div>
            </div>
          </Card>

          {/* Attendance */}
          {canSeeAcademic && (
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300">
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4">Présences récentes</h3>
            {studentAttendance.length > 0 ? (
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
                {studentAttendance.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                    <span className="text-sm text-foreground truncate">{new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className={cn('badge-modern shrink-0', attendanceColors[a.statut])}>
                      {attendanceLabels[a.statut]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune présence enregistrée</p>
            )}
          </Card>
          )}

          {/* Grades */}
          {canSeeAcademic && (
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300">
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4">Notes</h3>
            {studentGrades.length > 0 ? (
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
                {studentGrades.map(g => {
                  const assessment = assessments.find(a => a.id === g.assessment_id);
                  if (!assessment) return null;
                  return (
                    <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{assessment.libelle}</p>
                        <p className="text-xs text-muted-foreground truncate">{getSubjectName(assessment.subject_id)} · Coef. {assessment.coefficient}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {g.note !== null ? (
                          <>
                            <span className={cn('text-lg font-bold', g.note >= 10 ? 'text-success' : 'text-destructive')}>
                              {g.note}
                            </span>
                            <span className="text-xs text-muted-foreground">/20</span>
                          </>
                        ) : (
                          <span className="text-sm italic text-muted-foreground">{g.appreciation || '—'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune note enregistrée</p>
            )}
          </Card>
          )}

          {/* Payments */}
          {canSeeFinancial && (
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300">
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4">Paiements</h3>
            {studentInvoices.length > 0 ? (
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
                {studentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground capitalize truncate">{inv.type_frais}</p>
                      <p className="text-xs text-muted-foreground truncate">Émis le {new Date(inv.date_emission).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground truncate">{formatMoney(inv.montant_paye)} / {formatMoney(inv.montant_total)}</p>
                      <span className={cn(
                        'badge-modern',
                        inv.statut === 'paye' ? 'bg-success/10 text-success' :
                        inv.statut === 'partiel' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      )}>
                        {inv.statut === 'paye' ? 'Payé' : inv.statut === 'partiel' ? 'Partiel' : 'Impayé'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune facture</p>
            )}
          </Card>
          )}
        </div>

        {/* Right: parents + documents */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300">
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4">Parents / Tuteurs</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
              {parents.map(p => (
                <div key={p.id} className="p-3 rounded-xl border border-border">
                  <p className="text-sm font-medium text-foreground truncate">{p.nom}</p>
                  <div className="mt-2 space-y-1.5">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{p.telephone}</span>
                    </p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate-2">{p.adresse}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">Profession: {p.profession}</p>
                  </div>
                </div>
              ))}
              {parents.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun parent lié</p>
              )}
            </div>
          </Card>

          {canGenerateDocs && (
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300">
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4">Documents</h3>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10 shrink-0">
                    <FileText className="h-4 w-4 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{doc.nom}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.type} · {new Date(doc.date_ajout).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun document</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <p className="text-xs font-medium text-foreground mb-2">Générer un document officiel</p>
              <Button
                variant="outline" size="sm" onClick={handleDownloadCertificate} disabled={downloadingCertificate}
                className="w-full gap-1.5 justify-start rounded-xl"
              >
                {downloadingCertificate ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                <span className="truncate">Certificat de scolarité</span>
              </Button>
              <Button
                variant="outline" size="sm" onClick={handleDownloadIdCard} disabled={downloadingCard}
                className="w-full gap-1.5 justify-start rounded-xl"
              >
                {downloadingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                <span className="truncate">Carte scolaire</span>
              </Button>
              <select
                value={bulletinTermId}
                onChange={e => setBulletinTermId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
              >
                <option value="">Toutes les périodes</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}
              </select>
              <Button
                variant="outline" size="sm" onClick={handleDownloadBulletin} disabled={downloadingBulletin}
                className="w-full gap-1.5 justify-start rounded-xl"
              >
                {downloadingBulletin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="truncate">Bulletin PDF</span>
              </Button>
            </div>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
}
