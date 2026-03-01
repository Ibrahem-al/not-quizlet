/**
 * StudyFlow algorithms: FSRS (primary), SM-2 (legacy), Levenshtein, Fisher-Yates, written-answer grading.
 */

import type { Card } from '../types';
import { nextReviewFSRS, useFSRS } from './fsrs';

/**
 * Compute next review from quality (0–5). Uses FSRS when enabled, else SM-2.
 * Quality: 5=perfect, 4=correct with hesitation, 3=correct with difficulty,
 * 2=incorrect but familiar, 1=incorrect, 0=blackout.
 */
export function calculateNextReview(card: Card, quality: number): Card {
  if (useFSRS) {
    const result = nextReviewFSRS(card, quality);
    return {
      ...card,
      nextReviewDate: result.nextReviewDate,
      interval: result.interval,
      fsrs: result.fsrs,
    };
  }
  return calculateNextReviewSM2(card, quality);
}

/**
 * SM-2 Spaced Repetition (legacy): compute next review from quality (0–5).
 */
export function calculateNextReviewSM2(card: Card, quality: number): Card {
  let { repetition, interval, efFactor } = card;

  if (quality < 3) {
    repetition = 0;
    interval = 1;
  } else {
    repetition += 1;
    if (repetition === 1) interval = 1;
    else if (repetition === 2) interval = 6;
    else interval = Math.round(interval * efFactor);
  }

  efFactor =
    efFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (efFactor < 1.3) efFactor = 1.3;

  const nextReviewDate =
    Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    ...card,
    repetition,
    interval,
    efFactor,
    nextReviewDate,
  };
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Fisher-Yates shuffle. Returns new array.
 */
export function shuffle<T>(array: T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Grade written answer: case-insensitive, trim, typo tolerance (Levenshtein).
 * Default maxEditDistance 2.
 */
export function gradeWrittenAnswer(
  correct: string,
  user: string,
  maxEditDistance = 2
): boolean {
  const c = correct.trim().toLowerCase();
  const u = user.trim().toLowerCase();
  if (c === u) return true;
  return levenshtein(c, u) <= maxEditDistance;
}
