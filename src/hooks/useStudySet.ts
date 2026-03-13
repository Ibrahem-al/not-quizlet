import { useEffect, useMemo, useRef, useState } from 'react';
import { useStudyStore } from '../stores/studyStore';
import type { StudySet } from '../types';

export function useStudySet(id: string | undefined): StudySet | undefined {
  const sets = useStudyStore((s) => s.sets);
  const sharedSets = useStudyStore((s) => s.sharedSets);
  const fetchSharedSet = useStudyStore((s) => s.fetchSharedSet);
  // Track which IDs we've already attempted to fetch — prevents infinite loop
  // when the set is inaccessible (fetchSharedSet returns null)
  const fetchedIds = useRef(new Set<string>());
  const [retryCount, setRetryCount] = useState(0);

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

  // Retry once after a short delay if not found — handles race condition where
  // sharing_permissions entry is created just after the initial fetch
  useEffect(() => {
    if (id && !localMatch && !sharedMatch && retryCount === 0) {
      const timer = setTimeout(() => {
        setRetryCount(1);
        fetchSharedSet(id);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [id, localMatch, sharedMatch, retryCount, fetchSharedSet]);

  return localMatch || sharedMatch;
}
