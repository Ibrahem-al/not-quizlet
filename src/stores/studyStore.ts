import { create } from 'zustand';
import type { StudySet, Card, Settings } from '../types';
import { uuid, timestamp } from '../lib/utils';
import * as db from '../lib/db';
import { useAuthStore } from './authStore';
import { fetchUserSets, syncSetToCloud, deleteSetFromCloud } from '../lib/cloudSync';

interface StudyState {
  sets: StudySet[];
  currentSetId: string | null;
  settings: Settings | null;
  loaded: boolean;
}

interface StudyActions {
  loadSets: () => Promise<void>;
  addSet: (partial: Partial<StudySet>) => Promise<StudySet>;
  updateSet: (id: string, updates: Partial<StudySet>) => Promise<void>;
  deleteSet: (id: string) => Promise<void>;
  setCurrentSet: (id: string | null) => void;
  addCard: (setId: string, partial: Partial<Card>) => Promise<Card>;
  updateCard: (setId: string, cardId: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (setId: string, cardId: string) => Promise<void>;
  replaceSet: (set: StudySet) => Promise<void>;
  loadSettings: () => Promise<void>;
  putSettings: (s: Settings) => Promise<void>;
}

const defaultStudyStats = () => ({
  totalSessions: 0,
  averageAccuracy: 0,
  streakDays: 0,
});

const defaultCard = (partial: Partial<Card>): Card => ({
  id: uuid(),
  term: '',
  definition: '',
  difficulty: 0,
  repetition: 0,
  interval: 0,
  efFactor: 2.5,
  nextReviewDate: 0,
  history: [],
  ...partial,
});

export const useStudyStore = create<StudyState & StudyActions>((set, get) => ({
  sets: [],
  currentSetId: null,
  settings: null,
  loaded: false,

  loadSets: async () => {
    const user = useAuthStore.getState().user;
    if (user) {
      try {
        const cloudSets = await fetchUserSets(user.id);
        for (const s of cloudSets) await db.putSet(s);
        set({ sets: cloudSets, loaded: true });
      } catch {
        const sets = await db.getAllSets();
        set({ sets, loaded: true });
      }
    } else {
      const sets = await db.getAllSets();
      set({ sets, loaded: true });
    }
  },

  addSet: async (partial) => {
    const now = timestamp();
    const studySet: StudySet = {
      id: uuid(),
      title: partial.title ?? 'Untitled Set',
      description: partial.description ?? '',
      createdAt: now,
      updatedAt: now,
      tags: partial.tags ?? [],
      cards: partial.cards ?? [],
      lastStudied: 0,
      studyStats: defaultStudyStats(),
      ...partial,
    };
    await db.putSet(studySet);
    set((s) => ({ sets: [...s.sets, studySet] }));
    const user = useAuthStore.getState().user;
    if (user) {
      try { await syncSetToCloud(studySet, user.id); } catch { /* ignore */ }
    }
    return studySet;
  },

  updateSet: async (id, updates) => {
    const sets = get().sets;
    const idx = sets.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const next = { ...sets[idx], ...updates, updatedAt: timestamp() };
    await db.putSet(next);
    const nextSets = [...sets];
    nextSets[idx] = next;
    set({ sets: nextSets });
    const user = useAuthStore.getState().user;
    if (user) {
      try { await syncSetToCloud(next, user.id); } catch { /* ignore */ }
    }
  },

  deleteSet: async (id) => {
    await db.deleteSet(id);
    set((s) => ({
      sets: s.sets.filter((x) => x.id !== id),
      currentSetId: s.currentSetId === id ? null : s.currentSetId,
    }));
    if (useAuthStore.getState().user) {
      try { await deleteSetFromCloud(id); } catch { /* ignore */ }
    }
  },

  setCurrentSet: (id) => set({ currentSetId: id }),

  addCard: async (setId, partial) => {
    const sets = get().sets;
    const idx = sets.findIndex((s) => s.id === setId);
    if (idx === -1) throw new Error('Set not found');
    const card = defaultCard(partial);
    const studySet = sets[idx];
    const cards = [...studySet.cards, card];
    const updated = { ...studySet, cards, updatedAt: timestamp() };
    await db.putSet(updated);
    const nextSets = [...sets];
    nextSets[idx] = updated;
    set({ sets: nextSets });
    const user = useAuthStore.getState().user;
    if (user) {
      try { await syncSetToCloud(updated, user.id); } catch { /* ignore */ }
    }
    return card;
  },

  updateCard: async (setId, cardId, updates) => {
    const sets = get().sets;
    const idx = sets.findIndex((s) => s.id === setId);
    if (idx === -1) return;
    const studySet = sets[idx];
    const cards = studySet.cards.map((c) =>
      c.id === cardId ? { ...c, ...updates } : c
    );
    const updated = { ...studySet, cards, updatedAt: timestamp() };
    await db.putSet(updated);
    const nextSets = [...sets];
    nextSets[idx] = updated;
    set({ sets: nextSets });
    const user = useAuthStore.getState().user;
    if (user) {
      try { await syncSetToCloud(updated, user.id); } catch { /* ignore */ }
    }
  },

  deleteCard: async (setId, cardId) => {
    const sets = get().sets;
    const idx = sets.findIndex((s) => s.id === setId);
    if (idx === -1) return;
    const studySet = sets[idx];
    const cards = studySet.cards.filter((c) => c.id !== cardId);
    const updated = { ...studySet, cards, updatedAt: timestamp() };
    await db.putSet(updated);
    const nextSets = [...sets];
    nextSets[idx] = updated;
    set({ sets: nextSets });
    const user = useAuthStore.getState().user;
    if (user) {
      try { await syncSetToCloud(updated, user.id); } catch { /* ignore */ }
    }
  },

  replaceSet: async (studySet) => {
    await db.putSet(studySet);
    set((s) => {
      const idx = s.sets.findIndex((x) => x.id === studySet.id);
      const nextSets = [...s.sets];
      if (idx >= 0) nextSets[idx] = studySet;
      else nextSets.push(studySet);
      return { sets: nextSets };
    });
    const user = useAuthStore.getState().user;
    if (user) {
      try { await syncSetToCloud(studySet, user.id); } catch { /* ignore */ }
    }
  },

  loadSettings: async () => {
    const settings = await db.getSettings();
    set({ settings: settings ?? null });
  },

  putSettings: async (settings) => {
    await db.putSettings(settings);
    set({ settings });
  },
}));
