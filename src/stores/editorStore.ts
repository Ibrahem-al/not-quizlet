/**
 * Studio Mode editor: in-memory set being edited, unsaved state, card CRUD.
 * Persisted via useAutoSave → replaceSet to IndexedDB.
 */

import { create } from 'zustand';
import type { StudySet, Card } from '../types';
import { uuid } from '../lib/utils';

interface EditorState {
  set: StudySet | null;
  unsavedChanges: boolean;
  lastSaved: number;
}

interface EditorActions {
  loadSet: (set: StudySet) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  addCard: (index?: number, initialData?: Partial<Card>) => void;
  deleteCard: (cardId: string) => void;
  reorderCards: (oldIndex: number, newIndex: number) => void;
  updateSetMeta: (updates: Partial<Pick<StudySet, 'title' | 'description' | 'tags'>>) => void;
  setSaved: (savedAt: number) => void;
  markDirty: () => void;
}

const defaultCard = (): Card => ({
  id: uuid(),
  term: '',
  definition: '',
  difficulty: 0,
  repetition: 0,
  interval: 0,
  efFactor: 2.5,
  nextReviewDate: 0,
  history: [],
});

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  set: null,
  unsavedChanges: false,
  lastSaved: 0,

  loadSet: (studySet) => set({ set: { ...studySet }, unsavedChanges: false }),

  updateCard: (cardId, updates) => {
    const { set: s } = get();
    if (!s) return;
    const cards = s.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c));
    set({ set: { ...s, cards }, unsavedChanges: true });
  },

  addCard: (index, initialData) => {
    const { set: s } = get();
    if (!s) return;
    const card = { ...defaultCard(), ...initialData };
    const cards = [...s.cards];
    const i = index ?? cards.length;
    cards.splice(i, 0, card);
    set({ set: { ...s, cards }, unsavedChanges: true });
  },

  deleteCard: (cardId) => {
    const { set: s } = get();
    if (!s) return;
    const cards = s.cards.filter((c) => c.id !== cardId);
    set({ set: { ...s, cards }, unsavedChanges: true });
  },

  reorderCards: (oldIndex, newIndex) => {
    const { set: s } = get();
    if (!s) return;
    const cards = [...s.cards];
    const [removed] = cards.splice(oldIndex, 1);
    cards.splice(newIndex, 0, removed);
    set({ set: { ...s, cards }, unsavedChanges: true });
  },

  updateSetMeta: (updates) => {
    const { set: s } = get();
    if (!s) return;
    set({ set: { ...s, ...updates }, unsavedChanges: true });
  },

  setSaved: (savedAt) => set({ unsavedChanges: false, lastSaved: savedAt }),

  markDirty: () => set({ unsavedChanges: true }),
}));
