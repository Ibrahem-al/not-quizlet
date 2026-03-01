import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
}

interface AuthActions {
  init: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  session: null,
  initialized: false,

  init: async () => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ initialized: true });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null, session, initialized: true });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session });
    });
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ?? null };
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
