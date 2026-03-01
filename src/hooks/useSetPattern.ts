import { useMemo } from 'react';
import type { Card } from '../types';
import { analyzeSetPattern } from '../lib/ContextAnalyzer';

/** Infer set pattern from cards for context-aware AI suggestions. Only show suggestions when we have enough context. */
export function useSetPattern(cards: Card[]) {
  return useMemo(() => {
    const completed = cards.filter(
      (c) =>
        (c.term ?? '').replace(/<[^>]*>/g, '').trim().length > 0 &&
        (c.definition ?? '').replace(/<[^>]*>/g, '').trim().length > 0
    );
    if (completed.length < 2) return { pattern: { type: 'unknown' as const }, canSuggest: false };
    const pattern = analyzeSetPattern(cards);
    return { pattern, canSuggest: pattern.type !== 'unknown' };
  }, [cards]);
}
