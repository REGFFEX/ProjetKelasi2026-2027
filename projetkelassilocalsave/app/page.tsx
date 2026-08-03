'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Mail, Lock, ArrowRight, Shield, UserCog, Calculator, BookOpen, Users, CheckCircle2, Loader2 } from 'lucide-react';
import type { Role } from '@/lib/types';
import { roleLabels } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const roleIcons: Record<Role, typeof Shield> = {
  super_admin: Shield,
  school_admin: UserCog,
  secretary: Users,
  accountant: Calculator,
  teacher: BookOpen,
  parent: Users,
};

const roles: Role[] = ['school_admin', 'secretary', 'accountant', 'teacher', 'parent'];

export default function LoginPage() {
  const router = useRouter();
  const { signIn, session } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>('school_admin');
  const [email, setEmail] = useState('directeur@kelasi.cd');
  const [password, setPassword] = useState('Kelasi2026!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto fill preset demo accounts when changing role tab if fields haven't been customized heavily
  const demoCredentials: Record<Role, { email: string; pass: string }> = {
    super_admin: { email: 'admin@kelasi.cd', pass: 'Kelasi2026!' },
    school_admin: { email: 'directeur@kelasi.cd', pass: 'Kelasi2026!' },
    secretary: { email: 'secretaire@kelasi.cd', pass: 'Kelasi2026!' },
    accountant: { email: 'comptable@kelasi.cd', pass: 'Kelasi2026!' },
    teacher: { email: 'prof.esther@kelasi.cd', pass: 'Kelasi2026!' },
    parent: { email: 'parent.jean@kelasi.cd', pass: 'Kelasi2026!' },
  };

  const handleRoleSelect = (r: Role) => {
    setSelectedRole(r);
    const preset = demoCredentials[r];
    if (preset) {
      setEmail(preset.email);
      setPassword(preset.pass);
    }
  };

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (session) router.replace('/dashboard');
  }, [session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await signIn(email, password, selectedRole);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    } else {
      router.push('/dashboard');
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-3 sm:mb-4 text-balance">
            Le système d'exploitation numérique des établissements scolaires africains
          </h1>
          <p className="text-white/80 text-base sm:text-lg leading-relaxed hidden sm:block">
            Gérez élèves, notes, présences, paiements et communication — depuis un seul outil, accessible à chaque rôle.
          </p>
          <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: 'Écoles', value: '50+' },
              { label: 'Élèves', value: '12K+' },
              { label: 'Dispo.', value: '99.9%' },
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
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1.5">Connexion</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">Sélectionnez votre rôle et connectez-vous</p>

          {/* Role selector */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground mb-3 block">Je suis...</label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map(r => {
                const Icon = roleIcons[r];
                const isActive = selectedRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleSelect(r)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all duration-200 active:scale-95',
                      isActive
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                      {roleLabels[r]}
                    </span>
                  </button>
                );
              })}
            </div>
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
                  className="w-full rounded-xl border border-input bg-muted/30 pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
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
                  className="w-full rounded-xl border border-input bg-muted/30 pl-10 pr-3 py-2.5 text-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-input" />
                Se souvenir
              </label>
              <button type="button" className="text-sm text-primary hover:underline">
                Mot de passe oublié?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.97] shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span>Connexion sécurisée · Données chiffrées</span>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
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
