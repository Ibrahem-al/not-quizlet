import { useEffect, useMemo, useRef } from 'react';
import { useStudyStore } from '../stores/studyStore';
import type { StudySet } from '../types';

export function useStudySet(id: string | undefined): StudySet | undefined {
  const sets = useStudyStore((s) => s.sets);
  const sharedSets = useStudyStore((s) => s.sharedSets);
  const fetchSharedSet = useStudyStore((s) => s.fetchSharedSet);
  // Track which IDs we've already attempted to fetch — prevents infinite loop
  // when the set is inaccessible (fetchSharedSet returns null)
  const fetchedIds = useRef(new Set<string>());

  const localMatch = useMemo(
    () => (id ? sets.find((s) => s.id === id) : undefined),
    [id, sets]
  );

  const sharedMatch = id ? sharedSets.get(id) : undefined;

  useEffect(() => {
    if (id && !localMatch && !sharedMatch && !fetchedIds.current.has(id)) {
      fetchedIds.current.add(id);
      fetchSharedSet(id);
    }
  }, [id, localMatch, sharedMatch, fetchSharedSet]);

  return localMatch || sharedMatch;
}
