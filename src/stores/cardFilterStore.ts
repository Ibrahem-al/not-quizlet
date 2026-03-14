/**
 * Card filter store — session-only (no persistence).
 * Tracks which card IDs the user has selected for studying per set.
 * Default: all cards are selected. Resets on browser refresh.
 */

import { create } from 'zustand';

interface CardFilterState {
  /** Map of setId → Set of selected card IDs. Missing key = all selected. */
  selections: Record<string, Set<string>>;

  /** Get the selected card IDs for a set. Returns null if no filter is active (= all selected). */
  getSelectedIds: (setId: string) => Set<string> | null;

  /** Set the selected card IDs for a set. */
  setSelectedIds: (setId: string, ids: Set<string>) => void;

  /** Clear the filter for a set (revert to all selected). */
  clearFilter: (setId: string) => void;

  /** Check if a filter is active (i.e. not all cards are selected). */
  isFilterActive: (setId: string, totalCardCount: number) => boolean;
}

export const useCardFilterStore = create<CardFilterState>((set, get) => ({
  selections: {},

  getSelectedIds: (setId) => {
    return get().selections[setId] ?? null;
  },

  setSelectedIds: (setId, ids) => {
    set((state) => ({
      selections: { ...state.selections, [setId]: ids },
    }));
  },

  clearFilter: (setId) => {
    set((state) => {
      const { [setId]: _, ...rest } = state.selections;
      return { selections: rest };
    });
  },

  isFilterActive: (setId, totalCardCount) => {
    const selected = get().selections[setId];
    if (!selected) return false;
    return selected.size < totalCardCount;
  },
}));
