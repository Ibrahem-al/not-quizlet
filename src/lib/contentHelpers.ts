/**
 * Shared content helpers for HTML processing, text extraction, and card content analysis.
 * Consolidates duplicated helpers from TestMode, BlockBuilder, RaceToFinish, SpinnerMode, etc.
 */

import { shuffle } from './algorithms';
import type { Card } from '../types';

/** Strip all HTML tags and return trimmed plain text. */
export function getTextContent(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Strip HTML, lowercase, and trim — used for content equivalence comparison. */
export function normalizeContent(html: string): string {
  return getTextContent(html).toLowerCase();
}

/** Check if content contains only images with no meaningful text. */
export function isImageOnly(content: string): boolean {
  if (!content) return false;
  const withoutImages = content.replace(/<img[^>]*>/gi, '');
  const textContent = withoutImages.replace(/<[^>]*>/g, '').trim();
  return textContent === '' && content.includes('<img');
}

/** Check if content has any text (may also have images). */
export function hasTextContent(content: string): boolean {
  return getTextContent(content).length > 0;
}

/** Inject loading="lazy" on img tags that don't already have it. */
export function addLazyLoading(html: string): string {
  return html.replace(/<img(?!\s+loading=)/g, '<img loading="lazy"');
}

/**
 * Select cards for the requested question count, repeating evenly when
 * questionCount exceeds the number of available cards.
 */
export function selectCardsForQuestions(cards: Card[], questionCount: number): Card[] {
  if (questionCount <= cards.length) {
    return shuffle(cards).slice(0, questionCount);
  }
  const result: Card[] = [];
  const fullRounds = Math.floor(questionCount / cards.length);
  const remainder = questionCount % cards.length;
  for (let i = 0; i < fullRounds; i++) {
    result.push(...cards);
  }
  result.push(...shuffle([...cards]).slice(0, remainder));
  return shuffle(result);
}
