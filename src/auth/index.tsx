import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from './services/supabase';
import { AuthState, User } from './types/auth';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const mapSupabaseUser = (user: any): User | null => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at || user.created_at,
    };
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setState(prev => ({ ...prev, user: mapSupabaseUser(session.user), loading: false }));
      } else {
        setState(prev => ({ ...prev, user: null, loading: false }));
      }
    } catch {
      setState(prev => ({ ...prev, user: null, loading: false, error: 'Erro ao carregar sessão' }));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      await refreshUser();
      if (mounted) {
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setState(prev => ({ ...prev, user: mapSupabaseUser(session.user), loading: false }));
      } else if (event === 'SIGNED_OUT') {
        setState(prev => ({ ...prev, user: null, loading: false }));
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setState(prev => ({ ...prev, user: mapSupabaseUser(session.user) }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, error: error.message }));
        return { error: error.message };
      }

      const user = data.session?.user;
      if (user) {
        setState(prev => ({ ...prev, user: mapSupabaseUser(user), loading: false }));
      }
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao entrar';
      setState(prev => ({ ...prev, error: message }));
      return { error: message };
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

      if (error) {
        setState(prev => ({ ...prev, error: error.message }));
        return { error: error.message };
      }

      const user = data.session?.user;
      if (user) {
        setState(prev => ({ ...prev, user: mapSupabaseUser(user), loading: false }));
        return { error: null };
      }

      const message = 'Conta criada. Confirme seu email para entrar.';
      setState(prev => ({ ...prev, error: message }));
      return { error: message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      setState(prev => ({ ...prev, error: message }));
      return { error: message };
    }
  };

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return;
      }
      setState(prev => ({ ...prev, user: null, loading: false }));
    } catch {
      setState(prev => ({ ...prev, loading: false, error: 'Erro ao sair' }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}