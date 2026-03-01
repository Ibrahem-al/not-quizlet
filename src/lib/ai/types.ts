/**
 * AI content generation types – used by adapters (Ollama, OpenAI, Offline).
 */

import type { Card } from '../../types';

export interface QuizQuestion {
  type: 'multiple_choice' | 'true_false' | 'written';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface GeneratedCard {
  term: string;
  definition: string;
  mnemonic?: string;
}

export interface MagicCreateResult {
  cards: GeneratedCard[];
  suggestedTags: string[];
}

/** Adapter interface: same API for local (Ollama) and cloud (OpenAI) providers. */
export interface AIGenerator {
  readonly name: string;
  readonly available: boolean;

  generateDefinition(term: string, context?: string): Promise<string | null>;
  generateMnemonic(term: string, definition: string): Promise<string | null>;
  generateQuestions(content: string): Promise<QuizQuestion[]>;
  explainConcept(query: string, cardContext: Card): Promise<string | null>;
  /** Magic Create: topic → flashcards + mnemonics + tags */
  magicCreate(topic: string, count?: number): Promise<MagicCreateResult | null>;
  /** Extract Q&A pairs from unstructured text */
  extractCardsFromText(text: string): Promise<GeneratedCard[] | null>;
}

export type Rating = 1 | 2 | 3 | 4 | 5;
