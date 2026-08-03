'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Mail, Lock, User, Phone, Building2, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import type { Role } from '@/lib/types';
import { roleLabels } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fetchSchools } from '@/lib/api';

const roles: Role[] = ['school_admin', 'secretary', 'accountant', 'teacher', 'parent'];

interface SchoolOption {
  id: string;
  nom: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: '',
    role: 'parent' as Role,
    schoolId: '',
    acceptTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSchools().then(schools => {
      setSchoolOptions(schools.map(s => ({ id: s.id, nom: s.nom })));
      if (schools.length > 0 && !formData.schoolId) {
        setFormData(prev => ({ ...prev, schoolId: schools[0].id }));
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!formData.acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation');
      return;
    }
    setLoading(true);
    setError('');
    const { error: signUpError } = await signUp(
      formData.email,
      formData.password,
      formData.nom,
      formData.telephone,
      formData.role,
      formData.schoolId,
    );
    if (signUpError) {
      setError(signUpError);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="relative flex-1 bg-gradient-to-br from-primary via-primary to-info p-6 sm:p-8 lg:p-12 flex flex-col justify-between overflow-hidden min-h-[30vh] lg:min-h-screen">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold">Kelasi</p>
              <p className="text-sm text-white/80">Gestion Scolaire</p>
            </div>
          </Link>
        </div>
        <div className="relative z-10 max-w-md text-white">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-3 text-balance">
            Rejoignez la révolution digitale de l'éducation
          </h1>
          <p className="text-white/80 text-base sm:text-lg leading-relaxed hidden sm:block">
            Créez votre compte et accédez à tous les outils de gestion de votre établissement.
          </p>
          <div className="mt-6 space-y-2">
            {['Gestion complète des élèves et parents', 'Suivi des notes et présences en temps réel', 'Paiements et facturation automatisés'].map(t => (
              <div key={t} className="flex items-center gap-2 text-white/90">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs sm:text-sm text-white/60">© 2026 Kelasi — Digitech. Tous droits réservés.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Retour à la connexion
          </Link>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1.5">Créer un compte</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            Étape {step}/2 — {step === 1 ? 'Informations personnelles' : 'Rôle et établissement'}
          </p>

          {/* Progress bar */}
          <div className="flex gap-2 mb-6">
            <div className={cn('h-1.5 flex-1 rounded-full transition-colors', step >= 1 ? 'bg-primary' : 'bg-muted')} />
            <div className={cn('h-1.5 flex-1 rounded-full transition-colors', step >= 2 ? 'bg-primary' : 'bg-muted')} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nom complet *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={e => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full rounded-xl border border-input bg-muted/30 pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                      placeholder="Jean Mukendi"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-input bg-muted/30 pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                      className="w-full rounded-xl border border-input bg-muted/30 pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                      placeholder="+243 81 234 5678"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Mot de passe *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-xl border border-input bg-muted/30 pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmer le mot de passe *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full rounded-xl border border-input bg-muted/30 pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (formData.nom && formData.email && formData.password && formData.password === formData.confirmPassword) {
                      setError('');
                      setStep(2);
                    } else {
                      setError('Veuillez remplir tous les champs obligatoires');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.97] shadow-lg shadow-primary/20"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">Votre rôle *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {roles.map(r => {
                      const isActive = formData.role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormData({ ...formData, role: r })}
                          className={cn(
                            'flex items-center gap-2 rounded-xl border p-3 text-sm transition-all active:scale-95',
                            isActive ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <div className={cn('h-4 w-4 rounded-full border-2 shrink-0', isActive ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                          <span className={cn('font-medium', isActive ? 'text-primary' : 'text-foreground')}>{roleLabels[r]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Établissement *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      value={formData.schoolId}
                      onChange={e => setFormData({ ...formData, schoolId: e.target.value })}
                      className="w-full rounded-xl border border-input bg-muted/30 pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                    >
                      {schoolOptions.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={e => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    className="rounded border-input mt-0.5 shrink-0"
                  />
                  <span>J'accepte les <a href="#" className="text-primary hover:underline">conditions d'utilisation</a> et la <a href="#" className="text-primary hover:underline">politique de confidentialité</a></span>
                </label>

                {error && (
                  <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-all active:scale-[0.97]"
                  >
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.97] shadow-lg shadow-primary/20 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer mon compte'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte?{' '}
            <Link href="/" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
