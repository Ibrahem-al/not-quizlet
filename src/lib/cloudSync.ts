import type { StudySet } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

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
}

function toRow(set: StudySet, userId: string): StudySetRow {
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

export async function syncSetToCloud(set: StudySet, userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const row = toRow(set, userId);
  const { error } = await supabase.from('study_sets').upsert(row, {
    onConflict: 'id',
  });
  if (error) throw error;
}

export async function deleteSetFromCloud(setId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('study_sets').delete().eq('id', setId);
}

export { isSupabaseConfigured };
