/**
 * Debounced auto-save: sync editor set to IndexedDB via study store.
 * Runs validation before save; blocks save on hard errors and shows toast.
 * On QuotaExceededError, exports state to JSON and prompts user.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useEditorStore } from '../stores/editorStore';
import { useStudyStore } from '../stores/studyStore';
import { useValidationStore } from '../stores/validationStore';
import { useToastStore } from '../stores/toastStore';

const DEBOUNCE_MS = 1000;

function downloadBackup(studySet: { id: string; title: string; cards: unknown[] }) {
  const blob = new Blob([JSON.stringify(studySet, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `studyflow-backup-${studySet.id}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function useAutoSave() {
  const { set, unsavedChanges } = useEditorStore();
  const replaceSet = useStudyStore((s) => s.replaceSet);
  const lastSavedRef = useRef(0);
  const runValidation = useValidationStore((s) => s.runValidation);
  const canSave = useValidationStore((s) => s.canSave);
  const showToast = useToastStore((s) => s.show);

  const save = useCallback(async () => {
    const currentSet = useEditorStore.getState().set;
    if (!currentSet || !useEditorStore.getState().unsavedChanges) return;

    runValidation(currentSet);
    if (!useValidationStore.getState().canSave()) {
      showToast('error', 'Fix validation errors before saving (e.g. empty terms or too many characters).', 0);
      return;
    }

    const now = Date.now();
    try {
      await replaceSet({ ...currentSet, updatedAt: now });
      useEditorStore.getState().setSaved(now);
      lastSavedRef.current = now;
    } catch (err) {
      const isQuota = err instanceof DOMException && err.name === 'QuotaExceededError';
      if (isQuota) {
        downloadBackup(currentSet);
        showToast('error', "Storage full! We've downloaded your work. Free up space and re-import.", 0);
      } else {
        showToast('error', 'Save failed. Try again.', 0);
      }
    }
  }, [replaceSet, runValidation, canSave, showToast]);

  const debouncedSave = useDebouncedCallback(save, DEBOUNCE_MS);

  useEffect(() => {
    if (unsavedChanges && set) debouncedSave();
    return () => debouncedSave.cancel();
  }, [unsavedChanges, set?.updatedAt, debouncedSave]);

  return { save: debouncedSave, lastSaved: lastSavedRef.current };
}
