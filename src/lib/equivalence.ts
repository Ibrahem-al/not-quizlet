/**
 * Equivalence groups: cards sharing the same term or definition content
 * are treated as interchangeable for answer checking.
 */

import type { Card } from '../types';
import { gradeWrittenAnswer, shuffle } from './algorithms';
import { normalizeContent, getTextContent, hasTextContent } from './contentHelpers';

/* ── Types ──────────────────────────────────────────────── */

export interface EquivalenceGroups {
  /** normalizedTerm → all cards sharing that term */
  byTerm: Map<string, Card[]>;
  /** normalizedDefinition → all cards sharing that definition */
  byDefinition: Map<string, Card[]>;
}

/* ── Core ───────────────────────────────────────────────── */

/**
 * Build equivalence groups from a card array.
 * O(n) — call once per session via useMemo.
 * Skips grouping for sides with no text content (image-only).
 */
export function buildEquivalenceGroups(cards: Card[]): EquivalenceGroups {
  const byTerm = new Map<string, Card[]>();
  const byDefinition = new Map<string, Card[]>();

  for (const card of cards) {
    const normTerm = normalizeContent(card.term);
    if (normTerm) {
      const group = byTerm.get(normTerm);
      if (group) group.push(card);
      else byTerm.set(normTerm, [card]);
    }

    const normDef = normalizeContent(card.definition);
    if (normDef) {
      const group = byDefinition.get(normDef);
      if (group) group.push(card);
      else byDefinition.set(normDef, [card]);
    }
  }

  return { byTerm, byDefinition };
}

/* ── Query helpers ──────────────────────────────────────── */

/**
 * Get all valid plain-text answers for a card given an answer direction.
 *
 * If answerWith='definition': find all cards sharing this card's term,
 *   return their definitions (deduplicated by normalized content).
 * If answerWith='term': find all cards sharing this card's definition,
 *   return their terms.
 */
export function getEquivalentAnswers(
  card: Card,
  answerWith: 'term' | 'definition',
  groups: EquivalenceGroups,
): string[] {
  if (answerWith === 'definition') {
    const normTerm = normalizeContent(card.term);
    const group = normTerm ? groups.byTerm.get(normTerm) : undefined;
    if (!group || group.length <= 1) {
      return [getTextContent(card.definition)];
    }
    // Deduplicate definitions by normalized content
    const seen = new Set<string>();
    const answers: string[] = [];
    for (const c of group) {
      const normDef = normalizeContent(c.definition);
      if (normDef && !seen.has(normDef)) {
        seen.add(normDef);
        answers.push(getTextContent(c.definition));
      }
    }
    return answers.length > 0 ? answers : [getTextContent(card.definition)];
  } else {
    const normDef = normalizeContent(card.definition);
    const group = normDef ? groups.byDefinition.get(normDef) : undefined;
    if (!group || group.length <= 1) {
      return [getTextContent(card.term)];
    }
    const seen = new Set<string>();
    const answers: string[] = [];
    for (const c of group) {
      const normTermC = normalizeContent(c.term);
      if (normTermC && !seen.has(normTermC)) {
        seen.add(normTermC);
        answers.push(getTextContent(c.term));
      }
    }
    return answers.length > 0 ? answers : [getTextContent(card.term)];
  }
}

/**
 * Get all valid raw HTML answers for a card (for display/MC options).
 * Same logic as getEquivalentAnswers but returns raw HTML, not stripped text.
 */
export function getEquivalentAnswersHtml(
  card: Card,
  answerWith: 'term' | 'definition',
  groups: EquivalenceGroups,
): string[] {
  if (answerWith === 'definition') {
    const normTerm = normalizeContent(card.term);
    const group = normTerm ? groups.byTerm.get(normTerm) : undefined;
    if (!group || group.length <= 1) return [card.definition];
    const seen = new Set<string>();
    const answers: string[] = [];
    for (const c of group) {
      const normDef = normalizeContent(c.definition);
      if (normDef && !seen.has(normDef)) {
        seen.add(normDef);
        answers.push(c.definition);
      }
    }
    return answers.length > 0 ? answers : [card.definition];
  } else {
    const normDef = normalizeContent(card.definition);
    const group = normDef ? groups.byDefinition.get(normDef) : undefined;
    if (!group || group.length <= 1) return [card.term];
    const seen = new Set<string>();
    const answers: string[] = [];
    for (const c of group) {
      const normTermC = normalizeContent(c.term);
      if (normTermC && !seen.has(normTermC)) {
        seen.add(normTermC);
        answers.push(c.term);
      }
    }
    return answers.length > 0 ? answers : [card.term];
  }
}

/* ── MC helpers ─────────────────────────────────────────── */

/**
 * Filter wrong MC option pool: exclude cards whose answer-side content
 * matches any correct answer for the given card.
 */
export function getWrongOptionPool(
  card: Card,
  allCards: Card[],
  answerWith: 'term' | 'definition',
  groups: EquivalenceGroups,
): Card[] {
  const correctAnswersNorm = new Set<string>();

  if (answerWith === 'definition') {
    const normTerm = normalizeContent(card.term);
    const group = normTerm ? groups.byTerm.get(normTerm) : undefined;
    if (group) {
      for (const c of group) {
        const n = normalizeContent(c.definition);
        if (n) correctAnswersNorm.add(n);
      }
    } else {
      const n = normalizeContent(card.definition);
      if (n) correctAnswersNorm.add(n);
    }
  } else {
    const normDef = normalizeContent(card.definition);
    const group = normDef ? groups.byDefinition.get(normDef) : undefined;
    if (group) {
      for (const c of group) {
        const n = normalizeContent(c.term);
        if (n) correctAnswersNorm.add(n);
      }
    } else {
      const n = normalizeContent(card.term);
      if (n) correctAnswersNorm.add(n);
    }
  }

  return allCards.filter((c) => {
    const content = answerWith === 'term' ? c.term : c.definition;
    const norm = normalizeContent(content);
    return !correctAnswersNorm.has(norm);
  });
}

/**
 * Given a set of MC options (raw HTML strings), find all indices that are
 * correct answers for the given card, considering equivalence.
 */
export function findCorrectOptionIndices(
  options: string[],
  card: Card,
  answerWith: 'term' | 'definition',
  groups: EquivalenceGroups,
): number[] {
  const correctNorm = new Set<string>();
  const equivalents = getEquivalentAnswersHtml(card, answerWith, groups);
  for (const eq of equivalents) {
    correctNorm.add(normalizeContent(eq));
  }

  const indices: number[] = [];
  for (let i = 0; i < options.length; i++) {
    if (correctNorm.has(normalizeContent(options[i]))) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Build MC options that include multiple correct answers (for multi-answer MC mode).
 * Returns the HTML options array with equivalent answers included.
 * If there are no equivalent answers, falls back to standard 1-correct behavior.
 */
export function buildMultiAnswerOptions(
  card: Card,
  allCards: Card[],
  answerWith: 'term' | 'definition',
  groups: EquivalenceGroups,
): string[] {
  const equivHtml = getEquivalentAnswersHtml(card, answerWith, groups);
  const correct = answerWith === 'term' ? card.term : card.definition;

  // Deduplicate equivalent answers (keep up to 2 total correct options including the primary)
  const seen = new Set<string>();
  seen.add(normalizeContent(correct));
  const extraCorrect: string[] = [];
  for (const html of equivHtml) {
    const norm = normalizeContent(html);
    if (!seen.has(norm)) {
      seen.add(norm);
      extraCorrect.push(html);
      if (extraCorrect.length >= 1) break; // cap at 2 total correct (1 primary + 1 extra)
    }
  }

  const wrongPool = getWrongOptionPool(card, allCards, answerWith, groups);
  const wrongCount = 3 - extraCorrect.length; // fill remaining slots with wrong answers
  const wrong = shuffle(wrongPool)
    .slice(0, wrongCount)
    .map((c) => (answerWith === 'term' ? c.term : c.definition));

  return shuffle([correct, ...extraCorrect, ...wrong]);
}

/* ── T/F helpers ────────────────────────────────────────── */

/**
 * Check if a candidate answer is actually distinct from all correct answers.
 * Used to ensure T/F "false" pairings are genuinely wrong.
 */
export function isDistinctAnswer(
  candidate: string,
  correctAnswersNorm: Set<string>,
): boolean {
  return !correctAnswersNorm.has(normalizeContent(candidate));
}

/**
 * Build the set of normalized correct answers for a card + direction.
 */
export function getCorrectAnswersNormSet(
  card: Card,
  answerWith: 'term' | 'definition',
  groups: EquivalenceGroups,
): Set<string> {
  const answers = getEquivalentAnswers(card, answerWith, groups);
  return new Set(answers.map((a) => a.toLowerCase()));
}

/* ── Written answer grading ─────────────────────────────── */

/**
 * Grade a written answer against multiple correct answers.
 * Returns true if the user input matches ANY correct answer
 * (with typo tolerance via gradeWrittenAnswer).
 */
export function gradeWrittenAnswerMulti(
  correctAnswers: string[],
  userInput: string,
  maxEditDistance?: number,
): boolean {
  return correctAnswers.some((correct) =>
    gradeWrittenAnswer(correct, userInput, maxEditDistance),
  );
}

/* ── Match / Memory helpers ─────────────────────────────── */

/**
 * Check if a term tile and definition tile form a valid match,
 * considering equivalence groups.
 *
 * A term-tile's text can match a definition-tile's text if there exists
 * any card in the equivalence group of that term whose definition matches
 * the definition-tile's text, or vice versa.
 */
export function areMatchableByContent(
  termContent: string,
  defContent: string,
  groups: EquivalenceGroups,
): boolean {
  const normTerm = normalizeContent(termContent);
  const normDef = normalizeContent(defContent);

  if (!normTerm || !normDef) return false;

  const group = groups.byTerm.get(normTerm);
  if (!group) return false;

  for (const card of group) {
    if (normalizeContent(card.definition) === normDef) {
      return true;
    }
  }
  return false;
}

/**
 * Check if content has text suitable for equivalence comparison.
 * Image-only content should not participate in equivalence grouping.
 */
export function hasEquivalenceContent(content: string): boolean {
  return hasTextContent(content);
}
