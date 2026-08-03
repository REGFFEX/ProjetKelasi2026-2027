'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Role } from './types';
import { enableDemoAuth } from './config';

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
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, role?: Role, nom?: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nom: string, telephone: string, role: Role, schoolId: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      // 1. Immediately extract metadata from session user if available for instant response
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata || {};
      const fallbackRole: Role = (meta.role as Role) || 'school_admin';
      const fallbackNom = meta.nom || user?.email?.split('@')[0] || 'Utilisateur';

      const fallbackProfile: UserProfile = {
        id: userId,
        school_id: meta.school_id || null,
        nom: fallbackNom,
        email: user?.email || '',
        telephone: meta.telephone || '',
        role: fallbackRole,
        statut: 'actif',
      };

      // Set fallback profile right away so UI isn't blocked by DB queries
      setProfile(fallbackProfile);

      // 2. Try fetching full profile from DB if RLS allows it
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as UserProfile);
        setLoading(false);
        return;
      }

      // If RLS recursion (42P17) or missing row occurs, stick with fallback profile safely without upserting repeatedly
      if (error && error.code !== '42P17' && error.code !== 'PGRST116') {
        console.warn('Profile DB sync notice:', error.message);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        (async () => {
          await loadProfile(session.user.id);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string, role?: Role, nom?: string) => {
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // In development, allow demo accounts for local testing; otherwise keep auth strict.
    if (error && (error.message.includes('Invalid login credentials') || error.message.includes('User not found'))) {
      const isDemoDomain = enableDemoAuth && (email.endsWith('@kelasi.cd') || email.endsWith('@ecole-excellence.cd') || email.includes('demo'));
      if (isDemoDomain) {
        const userRole = role || (email.includes('directeur') ? 'school_admin' : email.includes('secretaire') ? 'secretary' : email.includes('comptable') ? 'accountant' : email.includes('prof') || email.includes('enseignant') ? 'teacher' : email.includes('parent') ? 'parent' : 'school_admin');
        const userNom = nom || (userRole === 'school_admin' ? 'Joseph Kabasele' : userRole === 'secretary' ? 'Marie Kalala' : userRole === 'accountant' ? 'Paul Mukendi' : userRole === 'teacher' ? 'Esther Tshala' : 'Jean Mukendi');

        const signUpRes = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nom: userNom,
              role: userRole,
            },
          },
        });

        if (!signUpRes.error) {
          const retry = await supabase.auth.signInWithPassword({ email, password });
          data = retry.data;
          error = retry.error;
        }
      }
    }

    if (error) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) {
        msg = 'Identifiants incorrects. Si vous n\'avez pas encore de compte, cliquez sur "Créer un compte".';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Votre adresse email n\'a pas encore été confirmée. Veuillez vérifier votre boîte de réception.';
      } else if (msg.includes('Failed to fetch')) {
        msg = 'Erreur de connexion au serveur. Veuillez vérifier votre connexion réseau.';
      }
      return { error: msg };
    }

    if (data.session) {
      setSession(data.session);
      await loadProfile(data.session.user.id);
    }
    return { error: null };
  }, [loadProfile]);

  const signUp = useCallback(async (email: string, password: string, nom: string, telephone: string, role: Role, schoolId: string) => {
    // 1. Register user with Supabase Auth including metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom,
          telephone,
          role,
          school_id: schoolId,
        },
      },
    });

    if (error) {
      let msg = error.message;
      if (msg.includes('User already registered') || msg.includes('already exists')) {
        msg = 'Un compte avec cet email existe déjà. Veuillez vous connecter.';
      } else if (msg.includes('Password should be at least')) {
        msg = 'Le mot de passe doit contenir au moins 6 caractères.';
      } else if (msg.includes('invalid email')) {
        msg = 'Adresse email invalide.';
      }
      return { error: msg };
    }

    if (data.user) {
      const profileData = {
        id: data.user.id,
        school_id: schoolId || null,
        nom,
        email,
        telephone: telephone || '',
        role,
        statut: 'actif' as const,
      };

      if (data.session) {
        try {
          await supabase.from('users').upsert(profileData, { onConflict: 'id' });
        } catch (e) {
          console.warn('User profile upsert warning:', e);
        }
        setSession(data.session);
        setProfile(profileData);
      } else {
        // Try sign-in if auto-confirm is enabled
        const signinAttempt = await supabase.auth.signInWithPassword({ email, password });
        if (signinAttempt.data.session) {
          setSession(signinAttempt.data.session);
          try {
            await supabase.from('users').upsert(profileData, { onConflict: 'id' });
          } catch (e) {
            console.warn('User profile upsert warning:', e);
          }
          await loadProfile(signinAttempt.data.session.user.id);
        }
      }
    }

    return { error: null };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
