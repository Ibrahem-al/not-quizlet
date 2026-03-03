export type { AIGenerator, QuizQuestion, MagicCreateResult, GeneratedCard, Rating } from './types';
export type { AIDiagnostics } from './getGenerator';
export { OfflineAdapter, OllamaAdapter } from './adapters';
export { getAIGenerator, getAIGeneratorSync, getAIUnavailableHint, resetAIGeneratorCache, getAIDiagnostics } from './getGenerator';
