import type { StudySet } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Tracks the last-synced updatedAt per set ID to skip redundant upserts.
 * If the set hasn't changed since the last sync, we skip the network call.
 */
const lastSyncedAt = new Map<string, number>();

/** Row shape in Supabase study_sets table (matches StudySet + user_id). */
interface StudySetRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  tags: string[];
  cards: StudySet['cards'];
  created_at: number;
  updated_at: number;
  last_studied: number;
  study_stats: StudySet['studyStats'];
  visibility: 'private' | 'public';
  sharing_mode: 'private' | 'restricted' | 'link' | 'public';
  folder_id: string | null;
}

function toRow(set: StudySet, userId: string): StudySetRow {
  // Ensure sharing mode and visibility are in sync
  const sharingMode = set.sharingMode || 'private';
  const visibility = sharingMode === 'public' ? 'public' : (set.visibility || 'private');
  
  return {
    id: set.id,
    user_id: userId,
    title: set.title,
    description: set.description,
    tags: set.tags,
    cards: set.cards,
    created_at: set.createdAt,
    updated_at: set.updatedAt,
    last_studied: set.lastStudied,
    study_stats: set.studyStats,
    visibility: visibility,
    sharing_mode: sharingMode,
    folder_id: set.folderId ?? null,
  };
}

function fromRow(row: StudySetRow): StudySet {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: row.tags,
    cards: row.cards,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastStudied: row.last_studied,
    studyStats: row.study_stats,
    visibility: row.visibility || 'private',
    userId: row.user_id,
    sharingMode: row.sharing_mode || 'private',
    folderId: row.folder_id ?? undefined,
  };
}

export async function fetchUserSets(userId: string): Promise<StudySet[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('study_sets')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => fromRow(r as StudySetRow));
}

/** Row shape returned by the lightweight get_public_sets() RPC. */
interface PublicSetRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  tags: string[];
  card_count: number;
  created_at: number;
  updated_at: number;
  last_studied: number;
  study_stats: StudySet['studyStats'];
  visibility: 'private' | 'public';
  sharing_mode: string;
  folder_id: string | null;
  owner_email: string | null;
}

function fromPublicRow(row: PublicSetRow): StudySet {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: row.tags,
    cards: [], // Not fetched — use cardCount for display
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastStudied: row.last_studied,
    studyStats: row.study_stats,
    visibility: row.visibility || 'private',
    userId: row.user_id,
    sharingMode: (row.sharing_mode as StudySet['sharingMode']) || 'private',
    folderId: row.folder_id ?? undefined,
    cardCount: row.card_count,
  };
}

export async function fetchPublicSets(): Promise<StudySet[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  // Use the lightweight RPC that returns card_count instead of full cards JSONB
  const { data, error } = await supabase.rpc('get_public_sets');
  if (error) throw error;
  return ((data ?? []) as PublicSetRow[]).map((r) => fromPublicRow(r));
}

export async function fetchSetById(setId: string): Promise<StudySet | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('study_sets')
    .select('*')
    .eq('id', setId)
    .maybeSingle();
  if (error) {
    console.warn('[cloudSync] fetchSetById failed:', error.message);
    return null;
  }
  if (!data) return null;
  return fromRow(data as StudySetRow);
}

export async function syncSetToCloud(set: StudySet, userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  // Skip if this exact version was already synced
  if (lastSyncedAt.get(set.id) === set.updatedAt) return;

  const row = toRow(set, userId);
  const { error } = await supabase.from('study_sets').upsert(row, {
    onConflict: 'id',
  });
  if (error) throw error;

  lastSyncedAt.set(set.id, set.updatedAt);
}

export async function fetchSetByToken(token: string): Promise<StudySet | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.rpc('get_set_by_share_token', {
    p_token: token,
  });
  if (error) {
    console.warn('[cloudSync] fetchSetByToken failed:', error.message);
    return null;
  }
  if (!data) return null;
  return fromRow(data as StudySetRow);
}

export async function deleteSetFromCloud(setId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('study_sets').delete().eq('id', setId);
}

export { isSupabaseConfigured };
