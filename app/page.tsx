'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Mail, Lock, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getDefaultRouteForRole } from '@/lib/navigation';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, session, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to the right home page based on the authenticated role
  useEffect(() => {
    if (session && profile) {
      router.replace(getDefaultRouteForRole(profile.role));
    }
  }, [session, profile, router]);

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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="relative flex-1 bg-gradient-to-br from-primary via-primary to-info p-6 sm:p-8 lg:p-12 flex flex-col justify-between overflow-hidden min-h-[40vh] lg:min-h-screen">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold">Kelasi</p>
              <p className="text-sm text-white/80">Gestion Scolaire</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md text-white">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/90 backdrop-blur-sm">
            Nouvelle génération de gestion scolaire
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-balance">
            Solution tout-en-un pour piloter votre école.
          </h1>
          <p className="mt-3 text-white/80 text-base leading-relaxed max-w-lg">
            Suivi des élèves, notes, présences, paiements et communication, dans une expérience moderne et fluide.
          </p>
          <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: 'Écoles', value: '50+' },
              { label: 'Élèves', value: '12K+' },
              { label: 'Disponibilité', value: '99.9%' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-white/10 backdrop-blur-md p-3 sm:p-4 border border-white/10">
                <p className="text-xl sm:text-2xl font-bold">{s.value}</p>
                <p className="text-xs sm:text-sm text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs sm:text-sm text-white/60">© 2026 Kelasi — Digitech. Tous droits réservés.</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/90 p-6 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Connexion</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Accédez à votre espace</h2>
            <p className="mt-2 text-sm text-muted-foreground">Connectez-vous avec votre compte et vous serez orienté vers votre tableau de bord selon votre profil.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-input bg-background/80 pl-10 pr-3 py-2.75 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-input bg-background/80 pl-10 pr-3 py-2.75 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Connexion sécurisée</span>
              </div>
              <button type="button" className="text-primary hover:underline font-medium">
                Mot de passe oublié?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.97] shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas encore de compte?{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
