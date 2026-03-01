import { useCallback } from 'react';
import { useStudyStore } from '../stores/studyStore';
import { calculateNextReview } from '../lib/algorithms';
import type { Card } from '../types';
import type { ReviewLog } from '../types';

export function useSpacedRep(setId: string) {
  const updateCard = useStudyStore((s) => s.updateCard);
  const getSet = useStudyStore.getState;
  const getSetById = () => getSet().sets.find((s) => s.id === setId);

  const recordReview = useCallback(
    async (
      card: Card,
      quality: number,
      timeSpent: number,
      mode: ReviewLog['mode']
    ) => {
      const updated = calculateNextReview(card, quality);
      const log: ReviewLog = {
        date: Date.now(),
        quality,
        timeSpent,
        mode,
      };
      const history = [...(updated.history ?? []), log];
      await updateCard(setId, card.id, {
        ...updated,
        history,
      });
      return updated;
    },
    [setId, updateCard]
  );

  const getUpdatedSet = useCallback(() => {
    const set = getSetById();
    if (!set) return null;
    return set;
  }, []);

  return { recordReview, getUpdatedSet };
}
