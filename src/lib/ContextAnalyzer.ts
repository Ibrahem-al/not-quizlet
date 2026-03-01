/**
 * Context-aware analysis of a set's cards to infer learning pattern (translation, definition, Q&A).
 * Used for smart AI suggestions (ghost text in definition field).
 */

import type { Card } from '../types';
import { stripHtml } from './validation';

export interface SetPattern {
  type: 'definition' | 'translation' | 'qa' | 'unknown';
  sourceLanguage?: string;
  targetLanguage?: string;
  subjectDomain?: string;
  definitionStyle?: 'formal' | 'simple' | 'example-based';
}

/** Infer pattern from first 5 completed cards. */
export function analyzeSetPattern(cards: Card[]): SetPattern {
  const completed = cards.filter(
    (c) => stripHtml(c.term).trim().length > 0 && stripHtml(c.definition).trim().length > 0
  ).slice(0, 5);

  if (completed.length === 0) return { type: 'unknown' };

  const avgTermLen = completed.reduce((s, c) => s + stripHtml(c.term).length, 0) / completed.length;
  const avgDefLen = completed.reduce((s, c) => s + stripHtml(c.definition).length, 0) / completed.length;

  // QA: terms often end with ?
  if (completed.some((c) => stripHtml(c.term).trim().endsWith('?'))) {
    return { type: 'qa' };
  }

  // Translation: both sides short (single words or short phrases)
  if (avgTermLen < 20 && avgDefLen < 20) {
    return {
      type: 'translation',
      sourceLanguage: 'detected',
      targetLanguage: 'detected',
    };
  }

  // Definition: term short, definition longer
  if (avgTermLen < 30 && avgDefLen > avgTermLen) {
    return {
      type: 'definition',
      subjectDomain: 'general',
      definitionStyle: 'simple',
    };
  }

  return { type: 'definition', subjectDomain: 'general' };
}

/** Build a prompt for the AI based on pattern and term (for ghost suggestion). */
export function getContextualPrompt(pattern: SetPattern, term: string): string {
  const t = term.trim();
  if (!t) return '';

  if (pattern.type === 'translation') {
    return `Translate "${t}" from ${pattern.sourceLanguage ?? 'the source language'} to ${pattern.targetLanguage ?? 'the target language'}. Respond with ONLY the translation, no explanation.`;
  }
  if (pattern.type === 'qa') {
    return `Answer this question briefly in one sentence: "${t}". Reply with only the answer.`;
  }
  if (pattern.type === 'definition') {
    return `Define "${t}" for a ${pattern.subjectDomain ?? 'general'} context. Keep it under 20 words, simple and clear. Reply with only the definition.`;
  }
  return `Define "${t}" in one clear sentence. Reply with only the definition.`;
}
