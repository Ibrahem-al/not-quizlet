import { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    __SUPABASE_URL__?: string;
    __SUPABASE_ANON_KEY__?: string;
  }
}

function getSupabaseConfig() {
  const url = (typeof window !== 'undefined' && window.__SUPABASE_URL__) || (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SUPABASE_URL) || '';
  const anonKey = (typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY__) || (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';
  return { url: String(url).trim(), anonKey: String(anonKey).trim() };
}

const { url, anonKey } = getSupabaseConfig();
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export function isSupabaseConfigured(): boolean {
  return !!(url && anonKey);
}
