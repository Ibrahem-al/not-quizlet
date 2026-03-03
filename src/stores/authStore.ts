import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  validatePassword,
  checkPasswordReuse,
  type PasswordValidationResult,
} from '../lib/passwordValidation';

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
}

interface SignUpResult {
  error: Error | null;
  validationErrors: string[];
  validation: PasswordValidationResult | null;
}

interface UpdatePasswordResult {
  error: Error | null;
  validationErrors: string[];
  isReused: boolean;
}

interface AuthActions {
  init: () => Promise<void>;
  signUp: (email: string, password: string, confirmPassword: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null; rateLimited: boolean }>;
  updatePassword: (newPassword: string, confirmPassword: string) => Promise<UpdatePasswordResult>;
  verifyCurrentPassword: (password: string) => Promise<boolean>;
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

  signUp: async (email, password, confirmPassword) => {
    if (!supabase) {
      return {
        error: new Error('Supabase not configured'),
        validationErrors: [],
        validation: null,
      };
    }

    // Validate password strength
    const validation = validatePassword(password);
    const validationErrors: string[] = [];

    if (!validation.isValid) {
      validation.requirements
        .filter((req) => !req.met && req.message)
        .forEach((req) => {
          if (req.message) validationErrors.push(req.message);
        });
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      validationErrors.push('Passwords do not match');
    }

    // If validation failed, return early
    if (validationErrors.length > 0) {
      return { error: null, validationErrors, validation };
    }

    // Proceed with sign up
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ?? null, validationErrors: [], validation };
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

  resetPassword: async (email) => {
    if (!supabase) {
      return { error: new Error('Supabase not configured'), rateLimited: false };
    }

    // Check rate limit via Supabase RPC
    try {
      const { data: canReset, error: rpcError } = await supabase.rpc(
        'can_request_password_reset',
        { p_email: email }
      );

      if (rpcError) {
        console.error('Error checking rate limit:', rpcError);
      }

      if (canReset === false) {
        return {
          error: new Error('Too many reset attempts. Please try again later.'),
          rateLimited: true,
        };
      }

      // Record the reset request
      await supabase.rpc('record_password_reset_request', { p_email: email });
    } catch (err) {
      console.error('Rate limit check failed:', err);
      // Continue even if rate limiting fails
    }

    // Send reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error: error ?? null, rateLimited: false };
  },

  updatePassword: async (newPassword, confirmPassword) => {
    const validationErrors: string[] = [];

    // Validate password strength
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      validation.requirements
        .filter((req) => !req.met && req.message)
        .forEach((req) => {
          if (req.message) validationErrors.push(req.message);
        });
    }

    // Check password confirmation
    if (newPassword !== confirmPassword) {
      validationErrors.push('Passwords do not match');
    }

    if (validationErrors.length > 0) {
      return { error: null, validationErrors, isReused: false };
    }

    if (!supabase) {
      return {
        error: new Error('Supabase not configured'),
        validationErrors: [],
        isReused: false,
      };
    }

    const user = get().user;
    if (!user) {
      return {
        error: new Error('User not authenticated'),
        validationErrors: [],
        isReused: false,
      };
    }

    // Check password reuse
    const isReused = await checkPasswordReuse(user.id, newPassword);
    if (isReused) {
      return {
        error: null,
        validationErrors: ['Cannot reuse any of your last 5 passwords'],
        isReused: true,
      };
    }

    // Update password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ?? null, validationErrors: [], isReused: false };
  },

  verifyCurrentPassword: async (password) => {
    if (!supabase) return false;

    const user = get().user;
    if (!user || !user.email) return false;

    // Verify by attempting to sign in
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    return !error;
  },
}));
