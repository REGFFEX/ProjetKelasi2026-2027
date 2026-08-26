'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiGet, apiPost, ApiError } from './api-client';
import type { Role } from './types';

export interface UserProfile {
  id: string;
  school_id: string | null;
  nom: string;
  email: string;
  telephone: string;
  role: Role;
  statut: 'actif' | 'inactif';
  avatar_url?: string;
}

interface AuthContextValue {
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyError(message: string): string {
  if (message.includes('Identifiants incorrects')) {
    return 'Identifiants incorrects. Vérifiez votre email et votre mot de passe.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiGet<UserProfile>('/auth/me');
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // A 401 from any authenticated call (session/cookie rejected, or the account was
  // deactivated mid-session) forces an immediate, visible logout instead of leaving
  // the UI stuck on stale data with dead buttons.
  useEffect(() => {
    const handleUnauthorized = () => {
      setProfile(prev => {
        if (prev) {
          try { sessionStorage.setItem('kelasi_session_expired', '1'); } catch { /* ignore */ }
        }
        return null;
      });
    };
    window.addEventListener('kelasi:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('kelasi:unauthorized', handleUnauthorized);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiPost<UserProfile>('/auth/login', { email, password });
      setProfile(data);
      return { error: null };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erreur de connexion au serveur.';
      return { error: friendlyError(message) };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiPost('/auth/logout');
    } finally {
      setProfile(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
