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
  signIn: (email: string, password: string, schoolId: string | null) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyError(message: string): string {
  if (message.includes('Identifiants incorrects')) {
    return 'Identifiants incorrects. Vérifiez votre école, votre email et votre mot de passe.';
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

  const signIn = useCallback(async (email: string, password: string, schoolId: string | null) => {
    try {
      const data = await apiPost<UserProfile>('/auth/login', { email, password, school_id: schoolId });
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
