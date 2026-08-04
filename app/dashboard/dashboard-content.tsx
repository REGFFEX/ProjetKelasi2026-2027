'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Clock, Wallet, AlertCircle, TrendingUp, GraduationCap, ArrowUpRight, ArrowDownRight, MessageSquare, ClipboardList, Plus, CheckSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart, Legend } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMoney, fetchStudents, fetchAttendance, fetchInvoices, fetchPayments, fetchClassrooms, fetchNotifications } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';

interface DashboardData {
  effectifTotal: number;
  presents: number;
  absents: number;
  retards: number;
  justifies: number;
  paiementsDuJour: number;
  impayesTotal: number;
  nouveauxEleves: number;
  recettesMensuelles: number;
  recettesParMois: { mois: string; montant: number }[];
  presencesParClasse: { classe: string; present: number; absent: number; retard: number; justifie: number }[];
  repartitionEffectif: { niveau: string; effectif: number }[];
}

const PIE_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'];

export function DashboardContent() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [students, attendance, invoices, payments, classrooms, notifications] = await Promise.all([
          fetchStudents(),
          fetchAttendance(),
          fetchInvoices(),
          fetchPayments(),
          fetchClassrooms(),
          fetchNotifications(),
        ]);

        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = attendance.filter(a => a.date === today);
        const presents = todayAttendance.filter(a => a.statut === 'present').length;
        const absents = todayAttendance.filter(a => a.statut === 'absent').length;
        const retards = todayAttendance.filter(a => a.statut === 'retard').length;
        const justifies = todayAttendance.filter(a => a.statut === 'justifie').length;

        const impayesTotal = invoices.reduce((sum, inv) => sum + inv.reste_a_payer, 0);
        const paiementsDuJour = payments
          .filter(p => p.date_paiement === today)
          .reduce((sum, p) => sum + p.montant, 0);

        const now = new Date();
        const currentMonth = now.getMonth();
        const recettesParMois: { mois: string; montant: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), currentMonth - i, 1);
          const monthStr = d.toLocaleDateString('fr-FR', { month: 'short' });
          const monthPayments = payments.filter(p => {
            const pd = new Date(p.date_paiement);
            return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
          });
          recettesParMois.push({ mois: monthStr, montant: monthPayments.reduce((s, p) => s + p.montant, 0) });
        }
        const recettesMensuelles = recettesParMois[recettesParMois.length - 1]?.montant ?? 0;

        const presencesParClasse = classrooms.map(c => {
          const classAtt = todayAttendance.filter(a => a.classroom_id === c.id);
          return {
            classe: c.nom,
            present: classAtt.filter(a => a.statut === 'present').length,
            absent: classAtt.filter(a => a.statut === 'absent').length,
            retard: classAtt.filter(a => a.statut === 'retard').length,
            justifie: classAtt.filter(a => a.statut === 'justifie').length,
          };
        });

        const niveauMap = new Map<string, number>();
        students.forEach(s => {
          const classroom = classrooms.find(c => c.id === s.classroom_id);
          if (classroom) {
            niveauMap.set(classroom.niveau, (niveauMap.get(classroom.niveau) ?? 0) + 1);
          }
        });
        const repartitionEffectif = Array.from(niveauMap.entries()).map(([niveau, effectif]) => ({ niveau, effectif }));

        setData({
          effectifTotal: students.length,
          presents,
          absents,
          retards,
          justifies,
          paiementsDuJour,
          impayesTotal,
          nouveauxEleves: 8,
          recettesMensuelles,
          recettesParMois,
          presencesParClasse,
          repartitionEffectif,
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Impossible de charger les données. Veuillez vous reconnecter.
      </div>
    );
  }

  const roleTitle: Record<Role, string> = {
    super_admin: 'Vue d’administration centrale',
    school_admin: 'Vue directeur',
    secretary: 'Vue secrétariat',
    accountant: 'Vue comptabilité',
    teacher: 'Vue enseignant',
    parent: 'Vue parent',
  };

  const roleSubtitle: Record<Role, string> = {
    super_admin: 'Suivi global de votre réseau scolaire',
    school_admin: 'Pilotage de l’établissement et de ses équipes',
    secretary: 'Gestion administrative et accompagnement des familles',
    accountant: 'Suivi des paiements et des finances',
    teacher: 'Suivi des classes et des évaluations',
    parent: 'Vue synthétique de votre espace parent',
  };

  const roleStats: Record<Role, Array<{ label: string; value: string; icon: typeof Users; color: string; bg: string; trend: string; trendUp: boolean }>> = {
    super_admin: [
      { label: 'Établissements', value: '3', icon: GraduationCap, color: 'text-primary', bg: 'bg-primary/10', trend: 'Actifs', trendUp: true },
      { label: 'Élèves', value: String(data.effectifTotal), icon: Users, color: 'text-success', bg: 'bg-success/10', trend: 'En ligne', trendUp: true },
      { label: 'Paiements', value: formatMoney(data.paiementsDuJour), icon: Wallet, color: 'text-info', bg: 'bg-info/10', trend: 'Aujourd’hui', trendUp: true },
      { label: 'Impayés', value: formatMoney(data.impayesTotal), icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', trend: 'À relancer', trendUp: false },
    ],
    school_admin: [
      { label: 'Effectif total', value: String(data.effectifTotal), icon: Users, color: 'text-primary', bg: 'bg-primary/10', trend: '+5 ce mois', trendUp: true },
      { label: 'Présents', value: String(data.presents), icon: UserCheck, color: 'text-success', bg: 'bg-success/10', trend: '80% présence', trendUp: true },
      { label: 'Absents', value: String(data.absents), icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10', trend: '1 justifié', trendUp: false },
      { label: 'Retards', value: String(data.retards), icon: Clock, color: 'text-warning', bg: 'bg-warning/10', trend: 'À surveiller', trendUp: false },
      { label: 'Paiements du jour', value: formatMoney(data.paiementsDuJour), icon: Wallet, color: 'text-info', bg: 'bg-info/10', trend: '+12% vs hier', trendUp: true },
      { label: 'Impayés total', value: formatMoney(data.impayesTotal), icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', trend: '8 élèves', trendUp: false },
      { label: 'Nouveaux élèves', value: String(data.nouveauxEleves), icon: GraduationCap, color: 'text-primary', bg: 'bg-primary/10', trend: 'Ce mois-ci', trendUp: true },
      { label: 'Recettes mensuelles', value: formatMoney(data.recettesMensuelles), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', trend: '+14%', trendUp: true },
    ],
    secretary: [
      { label: 'Élèves', value: String(data.effectifTotal), icon: Users, color: 'text-primary', bg: 'bg-primary/10', trend: 'Actifs', trendUp: true },
      { label: 'Présents', value: String(data.presents), icon: UserCheck, color: 'text-success', bg: 'bg-success/10', trend: 'Aujourd’hui', trendUp: true },
      { label: 'Absents', value: String(data.absents), icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10', trend: 'À traiter', trendUp: false },
      { label: 'Nouveaux élèves', value: String(data.nouveauxEleves), icon: GraduationCap, color: 'text-info', bg: 'bg-info/10', trend: 'Ce mois', trendUp: true },
    ],
    accountant: [
      { label: 'Paiements du jour', value: formatMoney(data.paiementsDuJour), icon: Wallet, color: 'text-success', bg: 'bg-success/10', trend: 'Aujourd’hui', trendUp: true },
      { label: 'Impayés', value: formatMoney(data.impayesTotal), icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', trend: 'À relancer', trendUp: false },
      { label: 'Recettes', value: formatMoney(data.recettesMensuelles), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', trend: 'Ce mois', trendUp: true },
      { label: 'Élèves', value: String(data.effectifTotal), icon: Users, color: 'text-info', bg: 'bg-info/10', trend: 'Actifs', trendUp: true },
    ],
    teacher: [
      { label: 'Classes', value: String(Math.min(4, data.effectifTotal > 0 ? Math.ceil(data.effectifTotal / 20) : 1)), icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10', trend: 'Assignées', trendUp: true },
      { label: 'Présents', value: String(data.presents), icon: UserCheck, color: 'text-success', bg: 'bg-success/10', trend: 'Aujourd’hui', trendUp: true },
      { label: 'Absents', value: String(data.absents), icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10', trend: 'À suivre', trendUp: false },
      { label: 'Notes', value: '12', icon: ClipboardList, color: 'text-warning', bg: 'bg-warning/10', trend: 'À publier', trendUp: false },
    ],
    parent: [
      { label: 'Élèves', value: '2', icon: GraduationCap, color: 'text-primary', bg: 'bg-primary/10', trend: 'Suivis', trendUp: true },
      { label: 'Paiements', value: '2', icon: Wallet, color: 'text-success', bg: 'bg-success/10', trend: 'À jour', trendUp: true },
      { label: 'Absences', value: '0', icon: UserCheck, color: 'text-info', bg: 'bg-info/10', trend: 'Cette semaine', trendUp: true },
      { label: 'Messages', value: '3', icon: MessageSquare, color: 'text-warning', bg: 'bg-warning/10', trend: 'Nouveaux', trendUp: false },
    ],
  };

  const currentRole = profile?.role ?? 'school_admin';
  const stats = roleStats[currentRole] ?? roleStats.school_admin;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{roleTitle[currentRole]}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{roleSubtitle[currentRole]} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href="/attendance">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <CheckSquare className="h-4 w-4" /> <span className="hidden sm:inline">Faire l'appel</span><CheckSquare className="h-4 w-4 sm:hidden" />
            </Button>
          </Link>
          <Link href="/students/new">
            <Button size="sm" className="gap-1.5 rounded-xl">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Inscrire un élève</span><span className="sm:hidden">Élève</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Indicator cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="p-4 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.bg)}>
                  <Icon className={cn('h-5 w-5', s.color)} />
                </div>
                <span className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  s.trendUp ? 'text-success' : 'text-muted-foreground'
                )}>
                  {s.trendUp && <ArrowUpRight className="h-3 w-3" />}
                  {!s.trendUp && <ArrowDownRight className="h-3 w-3" />}
                </span>
              </div>
              <p className="mt-3 text-lg sm:text-2xl font-bold text-foreground truncate">{s.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">{s.label}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 truncate hidden sm:block">{s.trend}</p>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Recettes mensuelles</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">6 derniers mois</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 shrink-0">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin -mx-4 sm:mx-0 px-4 sm:px-0">
            <ResponsiveContainer width="100%" height={260} minWidth={280}>
              <AreaChart data={data.recettesParMois}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                <Tooltip formatter={(v: number) => [formatMoney(v), 'Recettes']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="montant" stroke="#0ea5e9" strokeWidth={2} fill="url(#revGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Présences par classe</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Aujourd'hui</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin -mx-4 sm:mx-0 px-4 sm:px-0">
            <ResponsiveContainer width="100%" height={260} minWidth={280}>
              <BarChart data={data.presencesParClasse}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="classe" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="present" name="Présent" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="retard" name="Retard" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="justifie" name="Justifié" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5 shadow-card">
          <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4">Répartition des effectifs</h3>
          <div className="overflow-x-auto scrollbar-thin">
            <ResponsiveContainer width="100%" height={200} minWidth={200}>
              <PieChart>
                <Pie data={data.repartitionEffectif} dataKey="effectif" nameKey="niveau" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                  {data.repartitionEffectif.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 shadow-card lg:col-span-2">
          <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4">Activité récente</h3>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin">
            {[
              { icon: 'Wallet', text: 'Paiement reçu — Aimé Mukendi (250.000 FC)', time: 'Il y a 2h', color: 'text-success', bg: 'bg-success/10' },
              { icon: 'UserX', text: 'Absence signalée — Béatrice Kabongo (5ème A)', time: 'Il y a 3h', color: 'text-destructive', bg: 'bg-destructive/10' },
              { icon: 'GraduationCap', text: 'Nouvel élève inscrit — Christian Mwamba (6ème A)', time: 'Hier', color: 'text-info', bg: 'bg-info/10' },
              { icon: 'MessageSquare', text: 'Annonce publiée — Réunion parents-professeurs', time: 'Hier', color: 'text-warning', bg: 'bg-warning/10' },
              { icon: 'ClipboardList', text: 'Notes publiées — Devoir 1 Mathématiques (6ème A)', time: 'Il y a 2 jours', color: 'text-primary', bg: 'bg-primary/10' },
            ].map((a, i) => {
              const Icon = { Wallet, UserX, GraduationCap, MessageSquare, ClipboardList }[a.icon] || Wallet;
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl shrink-0', a.bg)}>
                    <Icon className={cn('h-4 w-4', a.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
