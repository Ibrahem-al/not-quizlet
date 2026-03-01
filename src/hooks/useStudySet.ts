import { useMemo } from 'react';
import { useStudyStore } from '../stores/studyStore';
import type { StudySet } from '../types';

export function useStudySet(id: string | undefined): StudySet | undefined {
  const sets = useStudyStore((s) => s.sets);
  return useMemo(
    () => (id ? sets.find((s) => s.id === id) : undefined),
    [id, sets]
  );
}
