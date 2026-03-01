/**
 * Validation state: card errors, set warnings, acknowledged overrides.
 * Used by editor and study flows to block save or study when invalid.
 */

import { create } from 'zustand';
import type { Card, StudySet } from '../types';
import {
  validateCard,
  validateSet,
  type ValidationError,
  type SetValidationError,
} from '../lib/validation';

export interface GlobalWarning {
  id: string;
  code: string;
  message: string;
  severity: 'warning' | 'info';
  acknowledged: boolean;
}

interface ValidationState {
  /** Card ID -> list of validation errors for that card */
  cardErrors: Map<string, ValidationError[]>;
  /** Set-level validation result (min cards, duplicates, etc.) */
  setValidation: {
    valid: boolean;
    canStudy: boolean;
    errors: SetValidationError[];
  } | null;
  /** Warnings user can dismiss (e.g. soft card warnings, tag missing) */
  globalWarnings: GlobalWarning[];
}

interface ValidationActions {
  /** Run validation for the current editor set; updates cardErrors and setValidation */
  runValidation: (set: StudySet | null) => void;
  /** Validate a single card (e.g. for inline display) */
  validateSingleCard: (card: Card) => ValidationError[];
  /** Whether the current validated set can be saved (call runValidation first). */
  canSave: () => boolean;
  /** Whether the set can start studying (min cards, no block errors) */
  canStudy: (set: StudySet | null) => boolean;
  /** Mark a global warning as acknowledged */
  markAsAcknowledged: (warningId: string) => void;
  /** Clear all validation state (e.g. when leaving editor) */
  clear: () => void;
}

const initialState: ValidationState = {
  cardErrors: new Map(),
  setValidation: null,
  globalWarnings: [],
};

export const useValidationStore = create<ValidationState & ValidationActions>((set, get) => ({
  ...initialState,

  runValidation: (studySet) => {
    if (!studySet) {
      set({ cardErrors: new Map(), setValidation: null, globalWarnings: [] });
      return;
    }
    const cardErrors = new Map<string, ValidationError[]>();
    for (const card of studySet.cards) {
      const result = validateCard(card);
      if (result.errors.length > 0) {
        cardErrors.set(card.id, result.errors);
      }
    }
    const setValidation = validateSet(studySet);
    const globalWarnings: GlobalWarning[] = setValidation.errors
      .filter((e) => e.severity === 'warning')
      .map((e, i) => ({
        id: `set-${e.code}-${i}`,
        code: e.code,
        message: e.message,
        severity: 'warning' as const,
        acknowledged: false,
      }));
    set({
      cardErrors,
      setValidation: {
        valid: setValidation.valid,
        canStudy: setValidation.canStudy,
        errors: setValidation.errors,
      },
      globalWarnings,
    });
  },

  validateSingleCard: (card) => {
    const result = validateCard(card);
    return result.errors;
  },

  canSave: () => {
    const { cardErrors, setValidation } = get();
    const hasHardCardError = Array.from(cardErrors.values()).some((list) =>
      list.some((e) => e.severity === 'hard')
    );
    if (hasHardCardError) return false;
    if (setValidation && !setValidation.valid) {
      const blockCodes = new Set(['MINIMUM_CARDS', 'MAXIMUM_CARDS']);
      const hasBlock = setValidation.errors.some(
        (e) => e.severity === 'block' && blockCodes.has(e.code)
      );
      if (hasBlock) return false;
    }
    return true;
  },

  canStudy: (set) => {
    if (!set) return false;
    return validateSet(set).canStudy;
  },

  markAsAcknowledged: (warningId) => {
    set((s) => ({
      globalWarnings: s.globalWarnings.map((w) =>
        w.id === warningId ? { ...w, acknowledged: true } : w
      ),
    }));
  },

  clear: () => set(initialState),
}));
