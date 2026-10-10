'use client';

import { useEffect, useState } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, Users, GraduationCap, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, PiggyBank, UserCog, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fetchBusinessOverview, formatMoney, formatMoneyCompact, type BusinessOverview } from '@/lib/api';

const REVENUE_BLUE = '#0ea5e9';
const CURRENT_PERIOD = '#0ea5e9';
const PREVIOUS_PERIOD = '#cbd5e1';
// Validated categorical set (adjacent-pair CVD + normal-vision checks pass in both
// modes) — kept distinct from the app's status colors (green/red/amber already mean
// paid/overdue/warning elsewhere) since fee type here is identity, not status.
const FEE_TYPE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];

const FEE_TYPE_LABELS: Record<string, string> = {
  scolarite: 'Scolarité',
  inscription: 'Inscription',
  cantine: 'Cantine',
  transport: 'Transport',
  autre: 'Autre',
};

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
}

interface DeltaProps {
  pct: number | null;
  upIsGood?: boolean;
  emptyLabel?: string;
}

function Delta({ pct, upIsGood = true, emptyLabel = 'Historique insuffisant' }: DeltaProps) {
  if (pct === null) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  }
  const isUp = pct > 0;
  const isFlat = pct === 0;
  const good = isFlat ? null : isUp === upIsGood;
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium',
      isFlat ? 'text-muted-foreground' : good ? 'text-success' : 'text-destructive'
    )}>
      <Icon className="h-3 w-3" /> {isFlat ? '0%' : `${isUp ? '+' : ''}${pct}%`}
    </span>
  );
}

function KpiTile({
  label, value, exactValue, icon: Icon, iconColor, iconBg, children,
}: {
  label: string; value: string; exactValue?: string; icon: typeof Wallet; iconColor: string; iconBg: string; children?: React.ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl shrink-0', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{label}</p>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-foreground truncate" title={exactValue}>{value}</p>
      {children && <div className="mt-1">{children}</div>}
    </Card>
  );
}

export function DirectorDashboardContent() {
  const [data, setData] = useState<BusinessOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchBusinessOverview()
      .then(d => { if (!cancelled) setData(d); })
      .catch(err => console.error('Business overview load error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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
        Impossible de charger les indicateurs. Veuillez vous reconnecter.
      </div>
    );
  }

  const { revenue, enrollment, staffing, alerts, academic_year_label } = data;
  const collectionColor =
    revenue.collection_rate_pct === null ? 'text-muted-foreground'
      : revenue.collection_rate_pct >= 85 ? 'text-success'
      : revenue.collection_rate_pct >= 70 ? 'text-warning'
      : 'text-destructive';

  const monthlyTrendData = revenue.monthly_trend.map(p => ({ label: monthLabel(p.mois), montant: p.montant }));
  const feeTypeData = revenue.by_fee_type.map(f => ({ label: FEE_TYPE_LABELS[f.type_frais] ?? f.type_frais, montant: f.montant }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Vue stratégique</h1>
        <p className="text-muted-foreground mt-1">
          Pilotage de l'établissement{academic_year_label ? ` · Année ${academic_year_label}` : ''}
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl bg-warning/10 px-3.5 py-3 text-sm text-warning animate-fade-in">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KpiTile label="Recettes ce mois" value={formatMoneyCompact(revenue.current_month)} exactValue={formatMoney(revenue.current_month)} icon={Wallet} iconColor="text-success" iconBg="bg-success/10">
          <Delta pct={revenue.trend_pct} />
        </KpiTile>
        <KpiTile label="Recouvrement" value={revenue.collection_rate_pct !== null ? `${revenue.collection_rate_pct}%` : '—'} icon={PiggyBank} iconColor={collectionColor} iconBg="bg-muted">
          <span className="text-xs text-muted-foreground">Année en cours</span>
        </KpiTile>
        <KpiTile label="Impayés" value={formatMoneyCompact(revenue.total_outstanding)} exactValue={formatMoney(revenue.total_outstanding)} icon={AlertTriangle} iconColor="text-destructive" iconBg="bg-destructive/10">
          <span className="text-xs text-muted-foreground">Sur {formatMoneyCompact(revenue.total_invoiced)} facturés</span>
        </KpiTile>
        <KpiTile label="Effectif total" value={String(enrollment.current_total)} icon={GraduationCap} iconColor="text-primary" iconBg="bg-primary/10">
          <Delta pct={enrollment.growth_pct} emptyLabel="Pas d'année précédente" />
        </KpiTile>
        <KpiTile label="Revenu / élève" value={revenue.revenue_per_student !== null ? formatMoneyCompact(revenue.revenue_per_student) : '—'} exactValue={revenue.revenue_per_student !== null ? formatMoney(revenue.revenue_per_student) : undefined} icon={Users} iconColor="text-info" iconBg="bg-info/10">
          <span className="text-xs text-muted-foreground">Année en cours</span>
        </KpiTile>
        {staffing.hourly_cost_this_month !== null ? (
          <KpiTile label="Coût vacataires" value={formatMoneyCompact(staffing.hourly_cost_this_month)} exactValue={formatMoney(staffing.hourly_cost_this_month)} icon={UserCog} iconColor="text-warning" iconBg="bg-warning/10">
            <span className="text-xs text-muted-foreground">Ce mois-ci</span>
          </KpiTile>
        ) : (
          <KpiTile label="Ratio élèves / enseignant" value={staffing.student_teacher_ratio !== null ? String(staffing.student_teacher_ratio) : '—'} icon={UserCog} iconColor="text-muted-foreground" iconBg="bg-muted">
            <span className="text-xs text-muted-foreground">{staffing.active_teachers} enseignant(s) actif(s)</span>
          </KpiTile>
        )}
      </div>

      {/* Revenue trend */}
      <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
        <h3 className="font-semibold text-foreground mb-1">Tendance des recettes</h3>
        <p className="text-xs text-muted-foreground mb-4">12 derniers mois — encaissements réels</p>
        <div className="overflow-x-auto scrollbar-thin">
          <ResponsiveContainer width="100%" height={260} minWidth={280}>
            <AreaChart data={monthlyTrendData}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={REVENUE_BLUE} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={REVENUE_BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => [formatMoney(v), 'Recettes']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Area type="monotone" dataKey="montant" stroke={REVENUE_BLUE} strokeWidth={2} fill="url(#revenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Enrollment by cycle, YoY */}
        <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
          <h3 className="font-semibold text-foreground mb-1">Effectifs par cycle</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {enrollment.has_previous_year ? "Année en cours vs année précédente" : "Année en cours (pas d'historique pour comparer)"}
          </p>
          {enrollment.by_cycle.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucun élève inscrit pour le moment.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <ResponsiveContainer width="100%" height={260} minWidth={280}>
                <BarChart data={enrollment.by_cycle}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="cycle" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  {enrollment.has_previous_year && <Legend wrapperStyle={{ fontSize: '12px' }} />}
                  {enrollment.has_previous_year && (
                    <Bar dataKey="precedent" name="Année précédente" fill={PREVIOUS_PERIOD} radius={[4, 4, 0, 0]} />
                  )}
                  <Bar dataKey="actuel" name="Année en cours" fill={CURRENT_PERIOD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Revenue by fee type */}
        <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
          <h3 className="font-semibold text-foreground mb-1">Recettes par type de frais</h3>
          <p className="text-xs text-muted-foreground mb-4">Année en cours — encaissements réels</p>
          {feeTypeData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune recette enregistrée pour le moment.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <ResponsiveContainer width="100%" height={260} minWidth={280}>
                <BarChart data={feeTypeData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip formatter={(v: number) => [formatMoney(v), 'Recettes']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Bar dataKey="montant" radius={[0, 4, 4, 0]}>
                    {feeTypeData.map((_, i) => (
                      <Cell key={i} fill={FEE_TYPE_COLORS[i % FEE_TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
