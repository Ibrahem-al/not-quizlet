/**
 * Offline AI adapter: no API keys, returns null or template responses.
 * Enables graceful degradation when no AI is configured.
 */

import type { AIGenerator, QuizQuestion, MagicCreateResult, GeneratedCard } from '../types';
import type { Card } from '../../../types';

export class OfflineAdapter implements AIGenerator {
  readonly name = 'Offline';
  readonly available = true;

  async generateDefinition(_term: string, _context?: string): Promise<string | null> {
    return null;
  }

  async generateMnemonic(_term: string, _definition: string): Promise<string | null> {
    return null;
  }

  async generateQuestions(_content: string): Promise<QuizQuestion[]> {
    return [];
  }

  async explainConcept(_query: string, _cardContext: Card): Promise<string | null> {
    return null;
  }

  async magicCreate(_topic: string, _count?: number): Promise<MagicCreateResult | null> {
    return null;
  }

  async extractCardsFromText(_text: string): Promise<GeneratedCard[] | null> {
    return null;
  }
}
