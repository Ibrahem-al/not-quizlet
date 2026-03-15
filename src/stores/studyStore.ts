import { create } from 'zustand';
import type { StudySet, Card, Settings } from '../types';
import { uuid, timestamp } from '../lib/utils';
import * as db from '../lib/db';
import { useAuthStore } from './authStore';
import { fetchUserSets, fetchPublicSets, fetchSetById, fetchSetByToken, syncSetToCloud, deleteSetFromCloud } from '../lib/cloudSync';

interface StudyState {
  sets: StudySet[];
  publicSets: StudySet[];
  sharedSets: Map<string, StudySet>;
  currentSetId: string | null;
  settings: Settings | null;
  loaded: boolean;
  publicSetsLoaded: boolean;
}

interface StudyActions {
  loadSets: () => Promise<void>;
  loadPublicSets: () => Promise<void>;
  addSet: (partial: Partial<StudySet>) => Promise<StudySet>;
  updateSet: (id: string, updates: Partial<StudySet>) => Promise<void>;
  deleteSet: (id: string) => Promise<void>;
  setCurrentSet: (id: string | null) => void;
  addCard: (setId: string, partial: Partial<Card>) => Promise<Card>;
  updateCard: (setId: string, cardId: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (setId: string, cardId: string) => Promise<void>;
  replaceSet: (set: StudySet) => Promise<void>;
  fetchSharedSet: (setId: string) => Promise<StudySet | null>;
  fetchSharedSetByToken: (token: string) => Promise<StudySet | null>;
  loadSettings: () => Promise<void>;
  putSettings: (s: Settings) => Promise<void>;
}

const defaultStudyStats = () => ({
  totalSessions: 0,
  averageAccuracy: 0,
  streakDays: 0,
});

const defaultSharingMode = (visibility: 'private' | 'public' = 'private'): 'private' | 'restricted' | 'link' | 'public' => {
  return visibility === 'public' ? 'public' : 'private';
};

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
  publicSets: [],
  sharedSets: new Map(),
  currentSetId: null,
  settings: null,
  loaded: false,
  publicSetsLoaded: false,

  loadSets: async () => {
    // Wait for auth to finish initializing so we know whether a user is signed in
    const auth = useAuthStore.getState();
    if (!auth.initialized) {
      await new Promise<void>((resolve) => {
        const unsub = useAuthStore.subscribe((state) => {
          if (state.initialized) { unsub(); resolve(); }
        });
        // Re-check in case it initialized between getState() and subscribe()
        if (useAuthStore.getState().initialized) { unsub(); resolve(); }
      });
    }
    const user = useAuthStore.getState().user;
    if (user) {
      try {
        const cloudSets = await fetchUserSets(user.id);
        const cloudIds = new Set(cloudSets.map((s) => s.id));
        for (const s of cloudSets) await db.putSet(s);
        // Include local sets that haven't been synced to cloud yet
        const allLocal = await db.getAllSets();
        const unsyncedLocal = allLocal.filter(
          (s) => !cloudIds.has(s.id) && (!s.userId || s.userId === user.id)
        );
        set({ sets: [...cloudSets, ...unsyncedLocal], loaded: true });
      } catch {
        // Cloud fetch failed — show this user's sets + unowned local sets
        const allLocal = await db.getAllSets();
        const userSets = allLocal.filter((s) => s.userId === user.id || !s.userId);
        set({ sets: userSets, loaded: true });
      }
    } else {
      const sets = await db.getAllSets();
      set({ sets, loaded: true });
    }
  },

  loadPublicSets: async () => {
    try {
      const publicSets = await fetchPublicSets();
      set({ publicSets, publicSetsLoaded: true });
    } catch {
      set({ publicSets: [], publicSetsLoaded: true });
    }
  },

  addSet: async (partial) => {
    const now = timestamp();
    const visibility = partial.visibility ?? 'private';
    
    // Auto-number untitled sets to avoid duplicates
    let title = partial.title?.trim() ?? '';
    if (!title) {
      const existingSets = get().sets;
      const untitledRegex = /^Untitled Set(?: (\d+))?$/;
      let maxNum = 0;
      
      for (const set of existingSets) {
        const match = set.title.match(untitledRegex);
        if (match) {
          const num = match[1] ? parseInt(match[1], 10) : 1;
          maxNum = Math.max(maxNum, num);
        }
      }
      
      title = maxNum === 0 ? 'Untitled Set' : `Untitled Set ${maxNum + 1}`;
    }
    
    const user = useAuthStore.getState().user;
    const studySet: StudySet = {
      id: uuid(),
      title,
      description: partial.description ?? '',
      createdAt: now,
      updatedAt: now,
      tags: partial.tags ?? [],
      cards: partial.cards ?? [],
      lastStudied: 0,
      studyStats: defaultStudyStats(),
      visibility,
      sharingMode: partial.sharingMode ?? defaultSharingMode(visibility),
      folderId: partial.folderId,
      effectivePermissions: partial.effectivePermissions,
      ...partial,
      ...(user ? { userId: user.id } : {}),
    };
    await db.putSet(studySet);
    set((s) => ({ sets: [...s.sets, studySet] }));
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

  fetchSharedSet: async (setId: string) => {
    // Check local cache first
    const existing = get().sharedSets.get(setId);
    if (existing) return existing;

    // Check if it's in our own sets
    const ownSet = get().sets.find(s => s.id === setId);
    if (ownSet) return ownSet;

    // Fetch from Supabase (RLS allows access to shared sets)
    const fetched = await fetchSetById(setId);
    if (fetched) {
      set(state => {
        const newMap = new Map(state.sharedSets);
        newMap.set(setId, fetched);
        return { sharedSets: newMap };
      });
      return fetched;
    }
    return null;
  },

  fetchSharedSetByToken: async (token: string) => {
    const fetched = await fetchSetByToken(token);
    if (fetched) {
      set(state => {
        const newMap = new Map(state.sharedSets);
        newMap.set(fetched.id, fetched);
        return { sharedSets: newMap };
      });
      return fetched;
    }
    return null;
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
