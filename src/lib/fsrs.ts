/**
 * FSRS (Free Spaced Repetition Scheduler) integration.
 * Uses ts-fsrs for scheduling; maps StudyFlow Card + quality (0–5) to FSRS and back.
 */

import { createEmptyCard, fsrs, type Card as FSRSCard, type CardInput, type Grade, Rating, State } from 'ts-fsrs';
import type { Card } from '../types';

const scheduler = fsrs();

/** Map StudyFlow quality (0–5) to FSRS Grade (Again=1, Hard=2, Good=3, Easy=4). */
export function qualityToGrade(quality: number): Grade {
  if (quality <= 1) return Rating.Again;
  if (quality === 2) return Rating.Hard;
  if (quality <= 4) return Rating.Good;
  return Rating.Easy;
}

/** Convert our Card to FSRS CardInput. New cards (no fsrs) get empty state with due=now. */
function toFSRSCard(card: Card, now: Date): CardInput {
  const fsrsState = card.fsrs;
  if (fsrsState) {
    return {
      due: new Date(card.nextReviewDate),
      stability: fsrsState.stability,
      difficulty: fsrsState.difficulty,
      state: fsrsState.state as State,
      last_review: new Date(fsrsState.lastReview),
      elapsed_days: 0,
      scheduled_days: 0,
      learning_steps: 0,
      reps: card.history?.length ?? 0,
      lapses: 0,
    };
  }
  const empty = createEmptyCard(now) as FSRSCard;
  return {
    ...empty,
    due: now,
    state: State.New,
  };
}

export interface FSRSResult {
  nextReviewDate: number;
  interval: number;
  fsrs: {
    stability: number;
    difficulty: number;
    state: number;
    lastReview: number;
  };
}

/**
 * Compute next review state using FSRS. Use this for all new reviews; legacy SM-2 cards
 * are migrated on first review (treated as New).
 */
export function nextReviewFSRS(card: Card, quality: number, now: Date = new Date()): FSRSResult {
  const grade = qualityToGrade(Math.max(0, Math.min(5, quality)));
  const input = toFSRSCard(card, now);
  const { card: nextCard } = scheduler.next(input, now, grade);
  const dueTime = nextCard.due instanceof Date ? nextCard.due.getTime() : new Date(nextCard.due).getTime();
  return {
    nextReviewDate: dueTime,
    interval: nextCard.scheduled_days ?? Math.round((dueTime - now.getTime()) / (24 * 60 * 60 * 1000)),
    fsrs: {
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      state: nextCard.state as number,
      lastReview: now.getTime(),
    },
  };
}

/** Whether to use FSRS for this card (default true; set to false to keep using SM-2 only). */
export const useFSRS = true;
