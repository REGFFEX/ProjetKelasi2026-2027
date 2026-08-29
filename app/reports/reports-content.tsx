'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Download, Wallet, CheckSquare, ClipboardList, TrendingUp, TrendingDown, Users, FileText, Clock, Loader2, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import {
  fetchInvoices, fetchPayments, fetchAttendance, fetchGrades, fetchAssessments, fetchStudents, fetchClassrooms,
  fetchTerms, fetchDeliberation, formatMoney, downloadReportPdf, type DeliberationReport,
} from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ReportType = 'financial' | 'attendance' | 'grades' | 'deliberation';

const reportTypes = [
  { id: 'financial' as ReportType, label: 'Rapport Financier', icon: Wallet, color: 'text-success', bg: 'bg-success/10' },
  { id: 'attendance' as ReportType, label: 'Rapport de Présence', icon: CheckSquare, color: 'text-info', bg: 'bg-info/10' },
  { id: 'grades' as ReportType, label: 'Rapport de Notes', icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
];

const decisionConfig = {
  admis: { label: 'Admis', color: 'text-success', bg: 'bg-success/10' },
  echoue: { label: 'Échoué', color: 'text-destructive', bg: 'bg-destructive/10' },
  absent: { label: 'Absent', color: 'text-muted-foreground', bg: 'bg-muted' },
};

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#64748b'];

export function ReportsContent() {
  const { profile } = useAuth();
  const canSeeDeliberation = profile?.role === 'school_admin' || profile?.role === 'secretary';
  const [activeReport, setActiveReport] = useState<ReportType>('financial');
  const [dateFrom, setDateFrom] = useState('2026-09-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Awaited<ReturnType<typeof fetchInvoices>>>([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof fetchPayments>>>([]);
  const [attendance, setAttendance] = useState<Awaited<ReturnType<typeof fetchAttendance>>>([]);
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof fetchGrades>>>([]);
  const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof fetchAssessments>>>([]);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);
  const [terms, setTerms] = useState<Awaited<ReturnType<typeof fetchTerms>>>([]);
  const [exporting, setExporting] = useState(false);

  const [delibClassroomId, setDelibClassroomId] = useState('');
  const [delibTermId, setDelibTermId] = useState('');
  const [delibSeuil, setDelibSeuil] = useState(10);
  const [delibLoading, setDelibLoading] = useState(false);
  const [delibError, setDelibError] = useState('');
  const [deliberation, setDeliberation] = useState<DeliberationReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [inv, pay, att, g, a, s, c, t] = await Promise.all([
          fetchInvoices(),
          fetchPayments(),
          fetchAttendance(),
          fetchGrades(),
          fetchAssessments(),
          fetchStudents(),
          fetchClassrooms(),
          fetchTerms(),
        ]);
        if (cancelled) return;
        setInvoices(inv);
        setPayments(pay);
        setAttendance(att);
        setGrades(g);
        setAssessments(a);
        setStudents(s);
        setClassrooms(c);
        setTerms(t);
        if (c.length > 0) setDelibClassroomId(c[0].id);
      } catch (e) {
        console.error('Failed to load reports data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activeReport !== 'deliberation' || !delibClassroomId) return;
    let cancelled = false;
    setDelibLoading(true);
    setDelibError('');
    fetchDeliberation(delibClassroomId, delibTermId || undefined, delibSeuil)
      .then(data => { if (!cancelled) setDeliberation(data); })
      .catch(e => { if (!cancelled) setDelibError(e instanceof ApiError ? e.message : 'Échec du chargement.'); })
      .finally(() => { if (!cancelled) setDelibLoading(false); });
    return () => { cancelled = true; };
  }, [activeReport, delibClassroomId, delibTermId, delibSeuil]);

  // Date range filter — applied once here, then every computation below uses the filtered arrays.
  const invoicesInRange = useMemo(
    () => invoices.filter(inv => inv.date_emission >= dateFrom && inv.date_emission <= dateTo),
    [invoices, dateFrom, dateTo]
  );
  const paymentsInRange = useMemo(
    () => payments.filter(p => p.date_paiement >= dateFrom && p.date_paiement <= dateTo),
    [payments, dateFrom, dateTo]
  );
  const attendanceInRange = useMemo(
    () => attendance.filter(a => a.date >= dateFrom && a.date <= dateTo),
    [attendance, dateFrom, dateTo]
  );
  const gradesInRange = useMemo(() => {
    const assessmentIdsInRange = new Set(
      assessments.filter(a => a.date >= dateFrom && a.date <= dateTo).map(a => a.id)
    );
    return grades.filter(g => assessmentIdsInRange.has(g.assessment_id));
  }, [grades, assessments, dateFrom, dateTo]);

  const handleExportPdf = async () => {
    if (activeReport === 'deliberation') return;
    setExporting(true);
    try {
      await downloadReportPdf(activeReport, dateFrom, dateTo);
    } catch (e) {
      console.error('Failed to export report:', e instanceof ApiError ? e.message : e);
    } finally {
      setExporting(false);
    }
  };

  // Financial data
  const totalBilled = invoicesInRange.reduce((s, inv) => s + inv.montant_total, 0);
  const totalCollected = invoicesInRange.reduce((s, inv) => s + inv.montant_paye, 0);
  const totalOutstanding = invoicesInRange.reduce((s, inv) => s + inv.reste_a_payer, 0);
  const collectionRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0';
  const paidCount = invoicesInRange.filter(i => i.statut === 'paye').length;
  const partialCount = invoicesInRange.filter(i => i.statut === 'partiel').length;
  const unpaidCount = invoicesInRange.filter(i => i.statut === 'impaye').length;

  const paymentMethodData = ['especes', 'mobile_money', 'virement', 'cheque'].map(method => {
    const methodPayments = paymentsInRange.filter(p => p.mode_paiement === method);
    return {
      method: method === 'especes' ? 'Espèces' : method === 'mobile_money' ? 'Mobile Money' : method === 'virement' ? 'Virement' : 'Chèque',
      montant: methodPayments.reduce((s, p) => s + p.montant, 0),
      count: methodPayments.length,
    };
  });

  // Attendance data
  const attendanceByClass = classrooms.map(c => {
    const classAttendance = attendanceInRange.filter(a => a.classroom_id === c.id);
    return {
      classe: c.nom,
      present: classAttendance.filter(a => a.statut === 'present').length,
      absent: classAttendance.filter(a => a.statut === 'absent').length,
      retard: classAttendance.filter(a => a.statut === 'retard').length,
      justifie: classAttendance.filter(a => a.statut === 'justifie').length,
    };
  });

  const attendanceDistribution = [
    { name: 'Présent', value: attendanceInRange.filter(a => a.statut === 'present').length },
    { name: 'Absent', value: attendanceInRange.filter(a => a.statut === 'absent').length },
    { name: 'Retard', value: attendanceInRange.filter(a => a.statut === 'retard').length },
    { name: 'Justifié', value: attendanceInRange.filter(a => a.statut === 'justifie').length },
  ];

  // Grades data
  const gradesByClass = classrooms.map(c => {
    const classStudents = students.filter(s => s.classroom_id === c.id);
    const classGrades = gradesInRange
      .filter(g => classStudents.some(s => s.id === g.student_id))
      .filter((g): g is typeof g & { note: number } => g.note !== null);
    const avg = classGrades.length > 0
      ? (classGrades.reduce((sum, g) => sum + g.note, 0) / classGrades.length).toFixed(1)
      : '0';
    const max = classGrades.length > 0 ? Math.max(...classGrades.map(g => g.note)) : 0;
    const min = classGrades.length > 0 ? Math.min(...classGrades.map(g => g.note)) : 0;
    const passRate = classGrades.length > 0
      ? ((classGrades.filter(g => g.note >= 10).length / classGrades.length) * 100).toFixed(0)
      : '0';
    return { classe: c.nom, moyenne: parseFloat(avg), max, min, passRate: parseInt(passRate), count: classGrades.length };
  });

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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Rapports</h1>
          <p className="text-muted-foreground mt-1 truncate">Rapports financiers, de présence et de notes</p>
        </div>
        {activeReport !== 'deliberation' && (
          <Button variant="outline" onClick={handleExportPdf} disabled={exporting} className="gap-1.5 rounded-xl active:scale-[0.97] transition-transform">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} <span className="hidden sm:inline">Exporter PDF</span>
          </Button>
        )}
      </div>

      {/* Report type selector */}
      <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4', canSeeDeliberation && 'lg:grid-cols-4')}>
        {reportTypes.map(rt => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.id}
              onClick={() => setActiveReport(rt.id)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.97]',
                activeReport === rt.id
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-card'
                  : 'border-border hover:bg-muted/50 hover:shadow-card-hover'
              )}
            >
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', rt.bg)}>
                <Icon className={cn('h-5 w-5', rt.color)} />
              </div>
              <span className={cn('text-sm font-medium truncate', activeReport === rt.id ? 'text-primary' : 'text-foreground')}>
                {rt.label}
              </span>
            </button>
          );
        })}
        {canSeeDeliberation && (
          <button
            onClick={() => setActiveReport('deliberation')}
            className={cn(
              'flex items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.97]',
              activeReport === 'deliberation'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-card'
                : 'border-border hover:bg-muted/50 hover:shadow-card-hover'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Award className="h-5 w-5 text-warning" />
            </div>
            <span className={cn('text-sm font-medium truncate', activeReport === 'deliberation' ? 'text-primary' : 'text-foreground')}>
              Délibération de classe
            </span>
          </button>
        )}
      </div>

      {/* Date range filter */}
      {activeReport !== 'deliberation' && (
      <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <Button size="sm" className="rounded-xl active:scale-[0.97] transition-transform">Filtrer</Button>
        </div>
      </Card>
      )}

      {/* FINANCIAL REPORT */}
      {activeReport === 'financial' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <p className="text-xs text-muted-foreground truncate">Total facturé</p>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1 truncate">{formatMoney(totalBilled)}</p>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <p className="text-xs text-muted-foreground truncate">Total encaissé</p>
              <p className="text-lg sm:text-xl font-bold text-success mt-1 truncate">{formatMoney(totalCollected)}</p>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <p className="text-xs text-muted-foreground truncate">Impayés</p>
              <p className="text-lg sm:text-xl font-bold text-destructive mt-1 truncate">{formatMoney(totalOutstanding)}</p>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <p className="text-xs text-muted-foreground truncate">Taux de recouvrement</p>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1 truncate">{collectionRate}%</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Recettes mensuelles</h3>
              <div className="overflow-x-auto scrollbar-thin">
                <ResponsiveContainer width="100%" height={280} minWidth={280}>
                  <BarChart data={paymentMethodData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="method" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                    <Tooltip formatter={(v: number) => [formatMoney(v), 'Recettes']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Bar dataKey="montant" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Répartition par mode de paiement</h3>
              <div className="overflow-x-auto scrollbar-thin">
                <ResponsiveContainer width="100%" height={280} minWidth={280}>
                  <BarChart data={paymentMethodData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                    <YAxis type="category" dataKey="method" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip formatter={(v: number) => [formatMoney(v), 'Montant']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Bar dataKey="montant" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
            <h3 className="font-semibold text-foreground mb-4">Statut des factures</h3>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 rounded-xl bg-success/10">
                <p className="text-2xl sm:text-3xl font-bold text-success">{paidCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">Payées</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl bg-warning/10">
                <p className="text-2xl sm:text-3xl font-bold text-warning">{partialCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">Partielles</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl bg-destructive/10">
                <p className="text-2xl sm:text-3xl font-bold text-destructive">{unpaidCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">Impayées</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ATTENDANCE REPORT */}
      {activeReport === 'attendance' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success shrink-0" />
                <p className="text-xs text-muted-foreground truncate">Taux de présence</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1 truncate">
                {attendanceInRange.length > 0 ? ((attendanceInRange.filter(a => a.statut === 'present').length / attendanceInRange.length) * 100).toFixed(1) : 0}%
              </p>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-info shrink-0" />
                <p className="text-xs text-muted-foreground truncate">Total présences</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1 truncate">{attendanceInRange.filter(a => a.statut === 'present').length}</p>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-muted-foreground truncate">Total absences</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1 truncate">{attendanceInRange.filter(a => a.statut === 'absent').length}</p>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning shrink-0" />
                <p className="text-xs text-muted-foreground truncate">Total retards</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1 truncate">{attendanceInRange.filter(a => a.statut === 'retard').length}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Présences par classe</h3>
              <div className="overflow-x-auto scrollbar-thin">
                <ResponsiveContainer width="100%" height={280} minWidth={280}>
                  <BarChart data={attendanceByClass}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="classe" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="present" name="Présent" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="retard" name="Retard" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="justifie" name="Justifié" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Répartition globale</h3>
              <div className="overflow-x-auto scrollbar-thin">
                <ResponsiveContainer width="100%" height={280} minWidth={280}>
                  <PieChart>
                    <Pie data={attendanceDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                      {attendanceDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* GRADES REPORT */}
      {activeReport === 'grades' && (
        <div className="space-y-4 sm:space-y-6">
          <Card className="overflow-hidden rounded-2xl shadow-card">
            <div className="p-4 sm:p-5 border-b border-border">
              <h3 className="font-semibold text-foreground">Moyennes par classe</h3>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Classe</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Élèves notés</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Moyenne</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Note max</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Note min</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Taux de réussite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {gradesByClass.map(g => (
                    <tr key={g.classe} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground truncate">{g.classe}</td>
                      <td className="px-4 py-3 text-center text-sm text-muted-foreground">{g.count}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('text-sm font-bold', g.moyenne >= 10 ? 'text-success' : 'text-destructive')}>
                          {g.moyenne}/20
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-success font-medium">{g.max}/20</td>
                      <td className="px-4 py-3 text-center text-sm text-destructive font-medium">{g.min}/20</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={cn('badge-modern', g.passRate >= 50 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                          {g.passRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
            <h3 className="font-semibold text-foreground mb-4">Évolution des moyennes par classe</h3>
            <div className="overflow-x-auto scrollbar-thin">
              <ResponsiveContainer width="100%" height={300} minWidth={280}>
                <LineChart data={gradesByClass}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="classe" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 20]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="moyenne" name="Moyenne" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="max" name="Note max" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="min" name="Note min" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* DELIBERATION REPORT */}
      {activeReport === 'deliberation' && canSeeDeliberation && (
        <div className="space-y-4 sm:space-y-6">
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Classe</label>
                <select
                  value={delibClassroomId}
                  onChange={e => setDelibClassroomId(e.target.value)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                >
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Période</label>
                <select
                  value={delibTermId}
                  onChange={e => setDelibTermId(e.target.value)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Cumul de l'année</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Seuil d'admission</label>
                <input
                  type="number" min={0} max={20} step={0.5}
                  value={delibSeuil}
                  onChange={e => setDelibSeuil(parseFloat(e.target.value) || 10)}
                  className="w-24 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          </Card>

          {delibLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : delibError ? (
            <Card className="p-6 rounded-2xl shadow-card text-center text-sm text-destructive">{delibError}</Card>
          ) : deliberation ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
                  <p className="text-xs text-muted-foreground truncate">Moyenne de classe</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground mt-1 truncate">
                    {deliberation.moyenne_classe !== null ? `${deliberation.moyenne_classe}/20` : '—'}
                  </p>
                </Card>
                <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
                  <p className="text-xs text-muted-foreground truncate">Admis</p>
                  <p className="text-lg sm:text-xl font-bold text-success mt-1 truncate">{deliberation.nb_admis}</p>
                </Card>
                <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
                  <p className="text-xs text-muted-foreground truncate">Échoués</p>
                  <p className="text-lg sm:text-xl font-bold text-destructive mt-1 truncate">{deliberation.nb_echoue}</p>
                </Card>
                <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
                  <p className="text-xs text-muted-foreground truncate">Absents (sans note)</p>
                  <p className="text-lg sm:text-xl font-bold text-muted-foreground mt-1 truncate">{deliberation.nb_absent}</p>
                </Card>
              </div>

              <Card className="overflow-hidden rounded-2xl shadow-card">
                <div className="p-4 sm:p-5 border-b border-border">
                  <h3 className="font-semibold text-foreground">{deliberation.classroom_nom} — Résultats</h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Rang</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Élève</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Matricule</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Moyenne</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Décision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deliberation.resultats.map(r => {
                        const cfg = decisionConfig[r.decision];
                        return (
                          <tr key={r.student_id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-center text-sm text-muted-foreground">{r.rang ?? '—'}</td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground truncate">{r.prenom} {r.nom}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{r.matricule}</td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-foreground">{r.moyenne !== null ? `${r.moyenne}/20` : '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={cn('badge-modern', cfg.bg, cfg.color)}>{cfg.label}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {deliberation.resultats.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun élève inscrit dans cette classe.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
