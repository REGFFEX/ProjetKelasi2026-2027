'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Building2,
  Users,
  ShieldCheck,
  School,
  UserCheck,
  Wallet,
  ClipboardList,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getDefaultRouteForRole } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to the right home page based on the authenticated role
  useEffect(() => {
    if (profile) {
      router.replace(getDefaultRouteForRole(profile.role));
    }
  }, [profile, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden lg:flex-row bg-background">
      {/* Left panel — branding (hidden on mobile per spec) */}
      <div className="relative hidden lg:flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-[#0B1E4D] p-10 xl:p-14">
        {/* Abstract depth: blurred blobs + subtle dot texture */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-300/20 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 -left-16 h-80 w-80 rounded-full bg-white/10 blur-[100px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        <div className="relative z-10 animate-fade-in">
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">Kelasi</p>
              <p className="text-sm text-white/70">Gestion Scolaire</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg animate-slide-up">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Nouvelle génération de gestion scolaire
          </div>
          <h1 className="mt-5 text-[2.25rem] xl:text-[2.75rem] font-bold leading-[1.1] tracking-tight text-balance text-white">
            Solution tout-en-un pour piloter{' '}
            <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              votre école.
            </span>
          </h1>
          <p className="mt-4 text-white/75 text-[15px] leading-relaxed max-w-md">
            Suivi des élèves, notes, présences, paiements et communication, dans une expérience moderne et fluide.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: 'Écoles', value: '50+', icon: Building2 },
              { label: 'Élèves', value: '12K+', icon: Users },
              { label: 'Disponibilité', value: '99.9%', icon: ShieldCheck },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 backdrop-blur-md transition-colors hover:bg-white/[0.1]"
              >
                <s.icon className="h-4 w-4 text-white/60" />
                <p className="mt-2 text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/60">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <DashboardPreview />
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/50">© 2026 Kelasi — Digitech. Tous droits réservés.</p>
      </div>

      {/* Right panel — login form */}
      <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-background p-5 sm:p-8">
        <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-primary/[0.04] blur-[90px]" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-primary/[0.05] blur-[90px]" />

        <div className="relative z-10 w-full min-w-0 max-w-[440px] animate-scale-in">
          {/* Mobile-only compact branding */}
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold leading-none text-foreground">Kelasi</p>
              <p className="text-xs text-muted-foreground">Gestion Scolaire</p>
            </div>
          </div>

          <div className="rounded-[20px] border border-border/70 bg-card p-7 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)] sm:p-9">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Connexion</p>
              <h2 className="mt-2 text-[26px] font-bold text-foreground">Accédez à votre espace</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Connectez-vous avec votre compte et vous serez orienté vers votre tableau de bord selon votre profil.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-7 space-y-4">
              <div>
                <Label htmlFor="email" className="mb-1.5 block text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-12 rounded-[12px] border-border bg-background pl-10 text-sm focus-visible:ring-primary/20"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="mb-1.5 block text-foreground">Mot de passe</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-12 rounded-[12px] border-border bg-background pl-10 pr-10 text-sm focus-visible:ring-primary/20"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-[12px] bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  <span>Connexion sécurisée</span>
                </div>
                <button type="button" className="font-medium text-primary hover:underline">
                  Mot de passe oublié ?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-[52px] w-full gap-2 rounded-[12px] bg-primary text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary/90 active:scale-[0.98] active:translate-y-0 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
              </Button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">OU</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                disabled
                aria-disabled
                title="Bientôt disponible"
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[12px] border border-border bg-background text-sm font-medium text-foreground/80 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              >
                <GoogleIcon className="h-4 w-4" />
                Se connecter avec Google
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Bientôt
                </span>
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.87c2.27-2.09 3.58-5.17 3.58-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3a7.15 7.15 0 0 1-10.65-3.76H1.42v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.42 14.34a7.2 7.2 0 0 1 0-4.62V6.6H1.42a12 12 0 0 0 0 10.85l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.42 6.6l4 3.11A7.16 7.16 0 0 1 12 4.77Z"
      />
    </svg>
  );
}

/** Purely decorative preview of the post-login dashboard — no live data. */
function DashboardPreview() {
  const stats = [
    { label: 'Élèves', value: '12,543', delta: '+12.5%', icon: Users },
    { label: 'Classes', value: '256', delta: '+8.2%', icon: School },
    { label: 'Enseignants', value: '145', delta: '+6.1%', icon: UserCheck },
    { label: 'Paiements', value: '98%', delta: '+3.7%', icon: Wallet },
  ];

  const activity = [
    { label: 'Paiement reçu', time: 'il y a 2 min', icon: Wallet, color: 'text-success bg-success/10' },
    { label: 'Absence signalée', time: 'il y a 15 min', icon: AlertTriangle, color: 'text-warning bg-warning/10' },
    { label: 'Nouvelle note', time: 'il y a 1h', icon: ClipboardList, color: 'text-info bg-info/10' },
    { label: 'Message envoyé', time: 'il y a 2h', icon: Send, color: 'text-primary bg-primary/10' },
  ];

  return (
    <div className="relative">
      <div className="rotate-[-1.5deg] rounded-2xl border border-white/10 bg-white p-4 shadow-2xl transition-transform duration-500 hover:rotate-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          </div>
          <p className="text-xs font-medium text-slate-400">Tableau de bord</p>
          <div className="h-5 w-5 rounded-full bg-slate-100" />
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl bg-slate-50 p-2">
              <s.icon className="h-3.5 w-3.5 text-primary" />
              <p className="mt-1 text-sm font-bold text-slate-800">{s.value}</p>
              <p className="truncate text-[9px] text-slate-500">{s.label}</p>
              <p className="text-[9px] font-medium text-success">{s.delta}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-5 gap-2">
          <div className="col-span-3 rounded-xl bg-slate-50 p-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-medium text-slate-500">Évolution des inscriptions</p>
              <p className="text-[8px] text-slate-400">Ce mois-ci</p>
            </div>
            <svg viewBox="0 0 200 60" className="mt-1.5 h-12 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(211 100% 50%)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="hsl(211 100% 50%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,45 L28,32 L57,38 L85,16 L114,26 L142,10 L171,22 L200,14 L200,60 L0,60 Z"
                fill="url(#sparklineFill)"
              />
              <path
                d="M0,45 L28,32 L57,38 L85,16 L114,26 L142,10 L171,22 L200,14"
                fill="none"
                stroke="hsl(211 100% 50%)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="col-span-2 rounded-xl bg-slate-50 p-2.5">
            <p className="text-[9px] font-medium text-slate-500">Activités récentes</p>
            <div className="mt-1.5 space-y-1.5">
              {activity.map(a => (
                <div key={a.label} className="flex items-center gap-1.5">
                  <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full', a.color)}>
                    <a.icon className="h-2.5 w-2.5" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[8px] font-medium text-slate-700">{a.label}</p>
                    <p className="text-[7px] text-slate-400">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative graduation cap accent */}
      <div className="absolute -bottom-4 -right-4 flex h-11 w-11 rotate-12 items-center justify-center rounded-2xl bg-gradient-to-br from-warning to-warning/70 shadow-lg ring-4 ring-primary/30">
        <GraduationCap className="h-5 w-5 text-white" />
      </div>
    </div>
  );
}
