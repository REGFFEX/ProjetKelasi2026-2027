'use client';

import { useState, useMemo, useEffect } from 'react';
import { Wallet, Plus, Search, Download, FileText, ArrowLeft, Save, CreditCard, TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { fetchInvoices, fetchPayments, fetchStudents, fetchClassrooms, formatMoney } from '@/lib/api';
import type { PaymentMethod } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const statusConfig = {
  paye: { label: 'Payé', color: 'text-success', bg: 'bg-success/10', dot: 'bg-success' },
  partiel: { label: 'Partiel', color: 'text-warning', bg: 'bg-warning/10', dot: 'bg-warning' },
  impaye: { label: 'Impayé', color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
};

const methodLabels: Record<PaymentMethod, string> = {
  especes: 'Espèces',
  cheque: 'Chèque',
  virement: 'Virement',
  mobile_money: 'Mobile Money',
};

type View = 'list' | 'payment' | 'receipt';

export function PaymentsContent() {
  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Awaited<ReturnType<typeof fetchInvoices>>[number] | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes');

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Awaited<ReturnType<typeof fetchInvoices>>>([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof fetchPayments>>>([]);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [classrooms, setClassrooms] = useState<Awaited<ReturnType<typeof fetchClassrooms>>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [inv, pay, s, c] = await Promise.all([
          fetchInvoices(),
          fetchPayments(),
          fetchStudents(),
          fetchClassrooms(),
        ]);
        if (cancelled) return;
        setInvoices(inv);
        setPayments(pay);
        setStudents(s);
        setClassrooms(c);
      } catch (e) {
        console.error('Failed to load payments data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getStudentName = (id: string) => {
    const s = students.find(s => s.id === id);
    return s ? `${s.prenom} ${s.nom}` : 'Inconnu';
  };
  const getClassroomName = (id: string) => classrooms.find(c => c.id === id)?.nom || 'Inconnu';

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const studentName = getStudentName(inv.student_id).toLowerCase();
      const matchSearch = studentName.includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.statut === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter, students]);

  const totalPaid = invoices.reduce((sum, inv) => sum + inv.montant_paye, 0);
  const totalDue = invoices.reduce((sum, inv) => sum + inv.reste_a_payer, 0);
  const totalRevenue = payments.reduce((sum, p) => sum + p.montant, 0);

  const handlePayment = (invoice: Awaited<ReturnType<typeof fetchInvoices>>[number]) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(String(invoice.reste_a_payer));
    setView('payment');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ===== LIST VIEW =====
  if (view === 'list') {
    return (
      <div className="space-y-5 sm:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Paiements</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gérez les factures, paiements et reçus</p>
          </div>
          <Button className="gap-1.5 rounded-xl active:scale-[0.97] shrink-0">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle facture</span>
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-success/15 to-success/5">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total encaissé</p>
                <p className="text-lg font-bold text-foreground truncate">{formatMoney(totalPaid)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-destructive/15 to-destructive/5">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Impayés</p>
                <p className="text-lg font-bold text-foreground truncate">{formatMoney(totalDue)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 sm:p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-info/15 to-info/5">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-lg font-bold text-foreground truncate">{payments.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom d'élève..."
              className="pl-10 rounded-xl"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all sm:w-auto"
          >
            <option value="all">Tous les statuts</option>
            <option value="paye">Payé</option>
            <option value="partiel">Partiel</option>
            <option value="impaye">Impayé</option>
          </select>
        </div>

        {/* Table — desktop */}
        <Card className="hidden md:block overflow-hidden rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Élève</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Total</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Payé</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Reste</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Statut</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.map(inv => {
                  const cfg = statusConfig[inv.statut as keyof typeof statusConfig];
                  const student = students.find(s => s.id === inv.student_id);
                  const initials = student ? `${student.prenom[0]}${student.nom[0]}` : '?';
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-info/10 text-primary text-xs font-semibold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{getStudentName(inv.student_id)}</p>
                            <p className="text-xs text-muted-foreground truncate">{getClassroomName(student?.classroom_id || '')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground capitalize truncate max-w-[140px]">{inv.type_frais}</td>
                      <td className="px-4 py-3 text-right text-sm text-foreground whitespace-nowrap">{formatMoney(inv.montant_total)}</td>
                      <td className="px-4 py-3 text-right text-sm text-success font-medium whitespace-nowrap">{formatMoney(inv.montant_paye)}</td>
                      <td className="px-4 py-3 text-right text-sm text-destructive font-medium whitespace-nowrap">{formatMoney(inv.reste_a_payer)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('badge-modern', cfg.bg, cfg.color)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {inv.reste_a_payer > 0 ? (
                          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl active:scale-[0.97]" onClick={() => handlePayment(inv)}>
                            <Wallet className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Payer</span>
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="gap-1.5 rounded-xl active:scale-[0.97]" onClick={() => { setSelectedInvoice(inv); setView('receipt'); }}>
                            <FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Reçu</span>
                          </Button>
                        )}
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
          {filteredInvoices.map(inv => {
            const cfg = statusConfig[inv.statut as keyof typeof statusConfig];
            const student = students.find(s => s.id === inv.student_id);
            const initials = student ? `${student.prenom[0]}${student.nom[0]}` : '?';
            return (
              <Card key={inv.id} className="p-4 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-info/10 text-primary text-sm font-semibold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{getStudentName(inv.student_id)}</p>
                        <p className="text-xs text-muted-foreground capitalize truncate">{inv.type_frais} · {getClassroomName(student?.classroom_id || '')}</p>
                      </div>
                      <span className={cn('badge-modern shrink-0', cfg.bg, cfg.color)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-medium text-foreground truncate">{formatMoney(inv.montant_total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Payé</p>
                        <p className="text-sm font-medium text-success truncate">{formatMoney(inv.montant_paye)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reste</p>
                        <p className="text-sm font-medium text-destructive truncate">{formatMoney(inv.reste_a_payer)}</p>
                      </div>
                    </div>
                    {inv.reste_a_payer > 0 && (
                      <Button size="sm" className="w-full mt-3 gap-1.5 rounded-xl active:scale-[0.97]" onClick={() => handlePayment(inv)}>
                        <Wallet className="h-3.5 w-3.5" /> Enregistrer un paiement
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== PAYMENT VIEW =====
  if (view === 'payment' && selectedInvoice) {
    const amount = parseFloat(paymentAmount) || 0;
    const newReste = selectedInvoice.reste_a_payer - amount;
    const isPartial = amount < selectedInvoice.reste_a_payer && amount > 0;
    const exceedsReste = amount > selectedInvoice.reste_a_payer;

    return (
      <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl active:scale-[0.97] shrink-0" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour</span>
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Enregistrer un paiement</h1>
        </div>

        <Card className="p-4 sm:p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
          {/* Invoice summary */}
          <div className="bg-muted/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="font-semibold text-foreground truncate">{getStudentName(selectedInvoice.student_id)}</h3>
              <span className="text-xs text-muted-foreground capitalize truncate">{selectedInvoice.type_frais}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Montant total</p>
                <p className="text-sm font-bold text-foreground truncate">{formatMoney(selectedInvoice.montant_total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Déjà payé</p>
                <p className="text-sm font-bold text-success truncate">{formatMoney(selectedInvoice.montant_paye)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reste à payer</p>
                <p className="text-sm font-bold text-destructive truncate">{formatMoney(selectedInvoice.reste_a_payer)}</p>
              </div>
            </div>
          </div>

          {/* Payment form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Montant du paiement (FC) *</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="mt-1.5 text-lg font-semibold rounded-xl"
                placeholder="0"
              />
              {exceedsReste && (
                <p className="text-xs text-destructive mt-1.5">Le montant dépasse le reste à payer!</p>
              )}
              {isPartial && !exceedsReste && (
                <p className="text-xs text-warning mt-1.5">Paiement partiel — reste {formatMoney(newReste)} après ce paiement</p>
              )}
              {amount === selectedInvoice.reste_a_payer && amount > 0 && (
                <p className="text-xs text-success mt-1.5">Paiement complet — la facture sera soldée</p>
              )}
            </div>

            <div>
              <Label htmlFor="method">Mode de paiement *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                {(Object.keys(methodLabels) as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all active:scale-95',
                      paymentMethod === m
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-card'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <CreditCard className={cn('h-5 w-5 transition-colors', paymentMethod === m ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-xs font-medium truncate w-full">{methodLabels[m]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="date">Date du paiement</Label>
              <Input
                id="date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="mt-1.5 rounded-xl"
              />
            </div>

            {/* Summary */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reste avant paiement</span>
                <span className="font-medium text-foreground">{formatMoney(selectedInvoice.reste_a_payer)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant du paiement</span>
                <span className="font-medium text-foreground">{formatMoney(amount)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Reste après paiement</span>
                <span className={cn('font-bold', newReste <= 0 ? 'text-success' : 'text-destructive')}>
                  {formatMoney(Math.max(0, newReste))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" className="rounded-xl active:scale-[0.97]" onClick={() => setView('list')}>Annuler</Button>
              <Button className="gap-1.5 rounded-xl active:scale-[0.97]" disabled={exceedsReste || amount <= 0} onClick={() => setView('receipt')}>
                <Save className="h-4 w-4" /> <span className="hidden sm:inline">Enregistrer & générer le reçu</span><span className="sm:hidden">Enregistrer</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ===== RECEIPT VIEW =====
  if (view === 'receipt' && selectedInvoice) {
    const student = students.find(s => s.id === selectedInvoice.student_id);
    const invoicePayments = payments.filter(p => p.invoice_id === selectedInvoice.id);

    return (
      <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl active:scale-[0.97] shrink-0" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour</span>
          </Button>
          <Button className="gap-1.5 rounded-xl active:scale-[0.97] shrink-0">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Télécharger PDF</span>
          </Button>
        </div>

        <Card className="p-4 sm:p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
          <div className="text-center mb-6 pb-6 border-b-2 border-border">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-xl shadow-card">
                K
              </div>
              <div className="text-left min-w-0">
                <p className="text-lg font-bold text-foreground truncate">École Mixte Lumumba</p>
                <p className="text-xs text-muted-foreground truncate">Av. de la Justice, Kinshasa · +243 81 234 5678</p>
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-4">REÇU DE PAIEMENT</h2>
            <p className="text-sm text-muted-foreground font-mono truncate">N° REC-{selectedInvoice.id.toUpperCase()}-{new Date().getFullYear()}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Élève</p>
              <p className="text-sm font-medium text-foreground truncate">{getStudentName(selectedInvoice.student_id)}</p>
              <p className="text-xs text-muted-foreground truncate">{student ? getClassroomName(student.classroom_id || '') : ''}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium text-foreground">{new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Type de frais</p>
              <p className="text-sm font-medium text-foreground capitalize truncate">{selectedInvoice.type_frais}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mode de paiement</p>
              <p className="text-sm font-medium text-foreground">{methodLabels[paymentMethod]}</p>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin mb-6">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-y border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Description</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2.5 text-sm text-foreground">Frais de {selectedInvoice.type_frais} — {getStudentName(selectedInvoice.student_id)}</td>
                  <td className="px-3 py-2.5 text-right text-sm font-medium text-foreground whitespace-nowrap">{formatMoney(selectedInvoice.montant_total)}</td>
                </tr>
                {invoicePayments.map(p => (
                  <tr key={p.id}>
                    <td className="px-3 py-2.5 text-sm text-success">Paiement ({methodLabels[p.mode_paiement as PaymentMethod]}) — {new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-success whitespace-nowrap">-{formatMoney(p.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-primary/5">
                  <td className="px-3 py-3 text-sm font-bold text-foreground text-right">Reste à payer:</td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn('text-lg font-bold', selectedInvoice.reste_a_payer <= 0 ? 'text-success' : 'text-destructive')}>
                      {formatMoney(selectedInvoice.reste_a_payer)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-6 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-8">Le Comptable</p>
              <div className="border-t border-border pt-1">
                <p className="text-xs text-muted-foreground">Signature et cachet</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-8">Le Directeur</p>
              <div className="border-t border-border pt-1">
                <p className="text-xs text-muted-foreground">Signature</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
