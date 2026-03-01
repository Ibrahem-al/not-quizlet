/**
 * Factory: pick AI adapter based on environment.
 * Tier 1: Offline (always works)
 * Tier 2: Ollama if VITE_OLLAMA_ENABLED and reachable
 * Tier 3: Cloud (OpenAI/Anthropic) when keys present – stub for now
 */

import type { AIGenerator } from './types';
import { OfflineAdapter } from './adapters/OfflineAdapter';
import { OllamaAdapter } from './adapters/OllamaAdapter';

const offline = new OfflineAdapter();
const ollama = new OllamaAdapter();

const OLLAMA_ENABLED =
  typeof import.meta.env !== 'undefined' &&
  (import.meta.env.VITE_OLLAMA_ENABLED === 'true' || import.meta.env.VITE_OLLAMA_ENABLED === true);

const OLLAMA_BASE = 'http://localhost:11434';

async function checkOllama(): Promise<boolean> {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, { method: 'GET' });
    return r.ok;
  } catch {
    return false;
  }
}

let cached: AIGenerator | null = null;
let lastCheck = 0;
const TTL_MS = 30_000;

/**
 * Returns the best available AI generator. Prefers Ollama when enabled and reachable.
 */
export async function getAIGenerator(): Promise<AIGenerator> {
  if (cached && Date.now() - lastCheck < TTL_MS) return cached;
  if (OLLAMA_ENABLED && (await checkOllama())) {
    cached = ollama;
  } else {
    cached = offline;
  }
  lastCheck = Date.now();
  return cached;
}

/**
 * Synchronous fallback when you need an adapter without awaiting (e.g. initial render).
 * Use getAIGenerator() when doing actual AI calls.
 */
export function getAIGeneratorSync(): AIGenerator {
  return cached ?? offline;
}

/**
 * Reset cache so next getAIGenerator() re-checks Ollama (e.g. after user enables it).
 */
export function resetAIGeneratorCache(): void {
  cached = null;
}
