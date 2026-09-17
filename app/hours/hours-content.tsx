'use client';

import { useState, useEffect, useMemo } from 'react';
import { Clock, Download, Loader2, Wallet } from 'lucide-react';
import { fetchTeachers, fetchHourlyRates, upsertHourlyRate, fetchHoursReport, formatMoney, type TeacherHoursReport } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { canWrite } from '@/lib/permissions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MOIS_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function HoursContent() {
  const { profile } = useAuth();
  // Fixer le taux horaire est une tâche de la scolarité (secrétariat) ; suivre les
  // séances effectuées et payer en conséquence reste le travail du comptable — deux
  // moitiés de cette page, visibles indépendamment selon qui la consulte.
  const canManageRates = canWrite(profile?.role, 'hourly_rates');
  const canSeeReport = profile?.role === 'school_admin' || profile?.role === 'accountant';
  const now = new Date();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Awaited<ReturnType<typeof fetchTeachers>>>([]);
  const [rates, setRates] = useState<Awaited<ReturnType<typeof fetchHourlyRates>>>([]);
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [report, setReport] = useState<TeacherHoursReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [savingRateFor, setSavingRateFor] = useState<string | null>(null);
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canManageRates) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [t, r] = await Promise.all([fetchTeachers(), fetchHourlyRates()]);
        if (cancelled) return;
        setTeachers(t);
        setRates(r);
        // Pre-fill each teacher's field with their real current rate — showing it
        // only as a placeholder left "Enregistrer" disabled until re-typed, which
        // read as a dead button for anyone just confirming an existing rate.
        setRateDrafts(Object.fromEntries(r.map(rate => [rate.teacher_id, String(rate.taux)])));
      } catch (e) {
        console.error('Failed to load hours data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [canManageRates]);

  useEffect(() => {
    if (!canSeeReport) return;
    let cancelled = false;
    setReportLoading(true);
    setError('');
    fetchHoursReport(mois, annee)
      .then(data => { if (!cancelled) setReport(data); })
      .catch(e => { if (!cancelled) setError(e instanceof ApiError ? e.message : 'Échec du chargement.'); })
      .finally(() => { if (!cancelled) setReportLoading(false); });
    return () => { cancelled = true; };
  }, [mois, annee, canSeeReport]);

  const rateByTeacher = useMemo(() => {
    const map: Record<string, number> = {};
    rates.forEach(r => { map[r.teacher_id] = r.taux; });
    return map;
  }, [rates]);

  const handleSaveRate = async (teacherId: string) => {
    const raw = rateDrafts[teacherId];
    const value = parseFloat(raw);
    if (isNaN(value) || value < 0) return;
    setSavingRateFor(teacherId);
    try {
      const updated = await upsertHourlyRate(teacherId, value);
      setRates(prev => {
        const exists = prev.some(r => r.teacher_id === teacherId);
        return exists ? prev.map(r => (r.teacher_id === teacherId ? updated : r)) : [...prev, updated];
      });
    } catch (e) {
      console.error('Failed to save rate:', e);
    } finally {
      setSavingRateFor(null);
    }
  };

  const handleExportCsv = () => {
    if (!report) return;
    const rows = [
      ['Enseignant', 'Séances', 'Heures', 'Taux (FC/h)', 'Montant (FC)'],
      ...report.lignes.map(l => [`${l.prenom} ${l.nom}`, String(l.nb_seances), String(l.total_heures), String(l.taux), String(l.montant)]),
      ['', '', '', 'Total', String(report.total_montant)],
    ];
    const csv = '﻿' + rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heures-enseignement-${annee}-${String(mois).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Suivi des heures d'enseignement</h1>
        <p className="text-muted-foreground mt-1">
          {canManageRates && canSeeReport
            ? "Taux horaires, séances effectuées et montants à payer (enseignants payés à l'heure)"
            : canManageRates
            ? "Configurez le taux horaire de chaque enseignant payé à l'heure."
            : "Séances effectuées et montants à payer (enseignants payés à l'heure)."}
        </p>
      </div>

      {canManageRates && (
      <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
        <h3 className="font-semibold text-foreground mb-4">Taux horaire par enseignant</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
          {teachers.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.prenom} {t.nom}</p>
              </div>
              <Input
                type="number" min={0} placeholder={rateByTeacher[t.id] !== undefined ? String(rateByTeacher[t.id]) : '0'}
                value={rateDrafts[t.id] ?? ''}
                onChange={e => setRateDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                className="w-28 rounded-xl text-sm"
              />
              <span className="text-xs text-muted-foreground shrink-0">FC/h</span>
              <Button
                size="sm" variant="outline" className="rounded-xl shrink-0"
                disabled={savingRateFor === t.id || !rateDrafts[t.id]}
                onClick={() => handleSaveRate(t.id)}
              >
                {savingRateFor === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
              </Button>
            </div>
          ))}
        </div>
      </Card>
      )}

      {canSeeReport && (
      <>
      <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Mois</label>
              <select
                value={mois}
                onChange={e => setMois(parseInt(e.target.value, 10))}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              >
                {MOIS_LABELS.map((label, i) => <option key={label} value={i + 1}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Année</label>
              <Input type="number" value={annee} onChange={e => setAnnee(parseInt(e.target.value, 10) || annee)} className="w-28 rounded-xl" />
            </div>
          </div>
          <Button variant="outline" onClick={handleExportCsv} disabled={!report || report.lignes.length === 0} className="gap-1.5 rounded-xl">
            <Download className="h-4 w-4" /> Exporter CSV
          </Button>
        </div>
      </Card>

      {reportLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-6 rounded-2xl shadow-card text-center text-sm text-destructive">{error}</Card>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-info shrink-0" />
                <p className="text-xs text-muted-foreground truncate">Total heures</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1">{report.total_heures}h</p>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl shadow-card">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-success shrink-0" />
                <p className="text-xs text-muted-foreground truncate">Total à payer</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-success mt-1">{formatMoney(report.total_montant)}</p>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-2xl shadow-card">
            <div className="p-4 sm:p-5 border-b border-border">
              <h3 className="font-semibold text-foreground">{MOIS_LABELS[mois - 1]} {annee}</h3>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Enseignant</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Séances</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Heures</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Taux</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.lignes.map(l => (
                    <tr key={l.teacher_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground truncate">{l.prenom} {l.nom}</td>
                      <td className="px-4 py-3 text-center text-sm text-muted-foreground">{l.nb_seances}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground">{l.total_heures}h</td>
                      <td className="px-4 py-3 text-center text-sm text-muted-foreground">{formatMoney(l.taux)}/h</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-foreground">{formatMoney(l.montant)}</td>
                    </tr>
                  ))}
                  {report.lignes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune séance enregistrée pour cette période.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
      </>
      )}
    </div>
  );
}
