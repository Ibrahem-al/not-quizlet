/**
 * Content & set validation – "Guardian, not gatekeeper."
 * Hard errors block save; soft warnings allow save with optional confirmation.
 */

import type { Card, StudySet } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const MAX_TERM_LENGTH = 500;
export const MAX_DEFINITION_LENGTH = 2000;
export const MIN_CARDS = 2;
export const MAX_CARDS = 2000;
export const LEVENSHTEIN_SIMILAR_THRESHOLD = 3;
export const ALL_CAPS_RATIO_THRESHOLD = 0.8;
export const URL_REGEX = /^https?:\/\/\S+$/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags and decode entities for plain-text length and comparison. */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  const doc = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (doc) {
    doc.innerHTML = html;
    return (doc.textContent || doc.innerText || '').trim();
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Levenshtein distance between two strings (for SUSPICIOUSLY_SIMILAR check). */
export function levenshtein(a: string, b: string): number {
  const sa = a.toLowerCase();
  const sb = b.toLowerCase();
  const m = sa.length;
  const n = sb.length;
  const d: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = sa[i - 1] === sb[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

function isUrlLike(text: string): boolean {
  const t = text.trim();
  return URL_REGEX.test(t) && t.length < 500;
}

function allCapsRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

/** Check if card has any meaningful content (text or image). */
function hasContent(card: Card): boolean {
  const termText = stripHtml(card.term);
  const defText = stripHtml(card.definition);
  const hasImage = Boolean(card.imageData);
  return (termText.length > 0 || defText.length > 0 || hasImage);
}

/** Allow empty term only when definition has content AND image is attached (image-only cards). */
function allowsEmptyTerm(card: Card): boolean {
  const defText = stripHtml(card.definition);
  return defText.length > 0 && Boolean(card.imageData);
}

// ---------------------------------------------------------------------------
// Card-level validation
// ---------------------------------------------------------------------------

export type CardValidationCode =
  | 'EMPTY_TERM'
  | 'EMPTY_CONTENT'
  | 'MAX_LENGTH_EXCEEDED'
  | 'SUSPICIOUSLY_SIMILAR'
  | 'URL_AS_CONTENT'
  | 'ALL_CAPS_DETECTED';

export interface ValidationError {
  code: CardValidationCode;
  severity: 'hard' | 'soft';
  message: string;
  /** For MAX_LENGTH_EXCEEDED: 'term' | 'definition' */
  field?: 'term' | 'definition';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const MESSAGES: Record<CardValidationCode, string> = {
  EMPTY_TERM: 'Every card needs a question or prompt.',
  EMPTY_CONTENT: 'Both term and definition are empty.',
  MAX_LENGTH_EXCEEDED: 'Text is too long. Shorten or split into more cards.',
  SUSPICIOUSLY_SIMILAR: 'Term and definition look very similar. Continue?',
  URL_AS_CONTENT: 'Did you mean to embed this as a link?',
  ALL_CAPS_DETECTED: 'Convert to sentence case?',
};

export function validateCard(card: Card): ValidationResult {
  const errors: ValidationError[] = [];
  const termPlain = stripHtml(card.term);
  const defPlain = stripHtml(card.definition);
  const termLen = termPlain.length;
  const defLen = defPlain.length;

  // --- Hard: EMPTY_CONTENT (both empty, no media)
  if (!hasContent(card)) {
    errors.push({
      code: 'EMPTY_CONTENT',
      severity: 'hard',
      message: MESSAGES.EMPTY_CONTENT,
    });
    return { valid: false, errors };
  }

  // --- Hard: EMPTY_TERM (unless image-only card)
  if (termLen === 0 && !allowsEmptyTerm(card)) {
    errors.push({
      code: 'EMPTY_TERM',
      severity: 'hard',
      message: MESSAGES.EMPTY_TERM,
    });
  }

  // --- Hard: MAX_LENGTH_EXCEEDED
  if (termLen > MAX_TERM_LENGTH) {
    errors.push({
      code: 'MAX_LENGTH_EXCEEDED',
      severity: 'hard',
      message: MESSAGES.MAX_LENGTH_EXCEEDED,
      field: 'term',
    });
  }
  if (defLen > MAX_DEFINITION_LENGTH) {
    errors.push({
      code: 'MAX_LENGTH_EXCEEDED',
      severity: 'hard',
      message: MESSAGES.MAX_LENGTH_EXCEEDED,
      field: 'definition',
    });
  }

  // --- Soft: SUSPICIOUSLY_SIMILAR
  if (termLen > 0 && defLen > 0 && levenshtein(termPlain, defPlain) < LEVENSHTEIN_SIMILAR_THRESHOLD) {
    errors.push({
      code: 'SUSPICIOUSLY_SIMILAR',
      severity: 'soft',
      message: MESSAGES.SUSPICIOUSLY_SIMILAR,
    });
  }

  // --- Soft: URL_AS_CONTENT (raw URL pasted)
  if (termLen > 0 && termLen < 500 && isUrlLike(termPlain)) {
    errors.push({
      code: 'URL_AS_CONTENT',
      severity: 'soft',
      message: MESSAGES.URL_AS_CONTENT,
      field: 'term',
    });
  }
  if (defLen > 0 && defLen < 500 && isUrlLike(defPlain)) {
    errors.push({
      code: 'URL_AS_CONTENT',
      severity: 'soft',
      message: MESSAGES.URL_AS_CONTENT,
      field: 'definition',
    });
  }

  // --- Soft: ALL_CAPS_DETECTED
  const termCaps = allCapsRatio(termPlain);
  const defCaps = allCapsRatio(defPlain);
  if (termPlain.length >= 3 && termCaps >= ALL_CAPS_RATIO_THRESHOLD) {
    errors.push({
      code: 'ALL_CAPS_DETECTED',
      severity: 'soft',
      message: MESSAGES.ALL_CAPS_DETECTED,
      field: 'term',
    });
  }
  if (defPlain.length >= 3 && defCaps >= ALL_CAPS_RATIO_THRESHOLD) {
    errors.push({
      code: 'ALL_CAPS_DETECTED',
      severity: 'soft',
      message: MESSAGES.ALL_CAPS_DETECTED,
      field: 'definition',
    });
  }

  const hasHard = errors.some((e) => e.severity === 'hard');
  return {
    valid: !hasHard,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Set-level validation
// ---------------------------------------------------------------------------

export type SetValidationCode =
  | 'MINIMUM_CARDS'
  | 'MAXIMUM_CARDS'
  | 'DUPLICATE_TERMS'
  | 'ORPHANED_MEDIA'
  | 'UNBALANCED_SET'
  | 'TAG_MISSING';

export interface SetValidationError {
  code: SetValidationCode;
  severity: 'block' | 'warning';
  message: string;
  /** For DUPLICATE_TERMS: card IDs with duplicate term text. */
  cardIds?: string[];
}

export interface SetValidation {
  valid: boolean;
  canStudy: boolean;
  errors: SetValidationError[];
}

export function validateSet(set: StudySet | null): SetValidation {
  const errors: SetValidationError[] = [];
  if (!set) {
    return { valid: false, canStudy: false, errors };
  }

  const cards = set.cards;
  const count = cards.length;

  // --- Block: MINIMUM_CARDS
  if (count < MIN_CARDS) {
    errors.push({
      code: 'MINIMUM_CARDS',
      severity: 'block',
      message: 'Study sets need at least 2 cards to be effective. Add another?',
    });
  }

  // --- Block: MAXIMUM_CARDS
  if (count > MAX_CARDS) {
    errors.push({
      code: 'MAXIMUM_CARDS',
      severity: 'block',
      message: 'Consider splitting into chapters. Maximum 2000 cards per set.',
    });
  }

  // --- Block: DUPLICATE_TERMS (case-insensitive identical terms)
  const termToIds = new Map<string, string[]>();
  for (const c of cards) {
    const t = stripHtml(c.term).toLowerCase().trim();
    if (!t) continue;
    const list = termToIds.get(t) || [];
    list.push(c.id);
    termToIds.set(t, list);
  }
  const duplicateIds: string[] = [];
  termToIds.forEach((ids) => {
    if (ids.length > 1) duplicateIds.push(...ids);
  });
  if (duplicateIds.length > 0) {
    errors.push({
      code: 'DUPLICATE_TERMS',
      severity: 'block',
      message: 'Some cards have the same term. Consider merging or making terms unique.',
      cardIds: duplicateIds,
    });
  }

  // --- Warning: TAG_MISSING (no tags, >20 cards)
  if (count > 20 && (!set.tags || set.tags.length === 0)) {
    errors.push({
      code: 'TAG_MISSING',
      severity: 'warning',
      message: 'Tags help you find this set later. Add a subject?',
    });
  }

  const hasBlock = errors.some((e) => e.severity === 'block');
  const canStudy = !hasBlock && count >= MIN_CARDS;

  return {
    valid: !hasBlock,
    canStudy,
    errors,
  };
}

/** Get duplicate term card IDs for highlighting in editor. */
export function getDuplicateTermCardIds(set: StudySet | null): Set<string> {
  const ids = new Set<string>();
  if (!set) return ids;
  const termToIds = new Map<string, string[]>();
  for (const c of set.cards) {
    const t = stripHtml(c.term).toLowerCase().trim();
    if (!t) continue;
    const list = termToIds.get(t) || [];
    list.push(c.id);
    termToIds.set(t, list);
  }
  termToIds.forEach((list) => {
    if (list.length > 1) list.forEach((id) => ids.add(id));
  });
  return ids;
}
