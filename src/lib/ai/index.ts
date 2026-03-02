export type { AIGenerator, QuizQuestion, MagicCreateResult, GeneratedCard, Rating } from './types';
export { OfflineAdapter, OllamaAdapter } from './adapters';
export { getAIGenerator, getAIGeneratorSync, getAIUnavailableHint, resetAIGeneratorCache } from './getGenerator';
