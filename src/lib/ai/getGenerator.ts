/**
 * Factory: pick AI adapter based on environment.
 * Tier 1: Offline (always works – returns null)
 * Tier 2: Ollama if VITE_OLLAMA_ENABLED and reachable
 * Tier 3: Cloud (OpenAI/Anthropic) when keys present – stub for now
 */

import type { AIGenerator } from './types';
import { OfflineAdapter } from './adapters/OfflineAdapter';
import { OllamaAdapter } from './adapters/OllamaAdapter';
import { setActiveOllamaModel } from './ollamaConfig';

const offline = new OfflineAdapter();
const ollama = new OllamaAdapter();

const OLLAMA_BASE = 'http://localhost:11434';

const FALLBACK_MODELS = ['llama3.2', 'llama3', 'llama3.1', 'mistral', 'phi3', 'gemma2'];

function isOllamaEnabled(): boolean {
  const v =
    (typeof window !== 'undefined' && (window as { __VITE_OLLAMA_ENABLED__?: string }).__VITE_OLLAMA_ENABLED__) ||
    (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_OLLAMA_ENABLED);
  return v === 'true' || v === true;
}

function getPreferredModel(): string {
  return (
    (typeof window !== 'undefined' && (window as { __VITE_OLLAMA_MODEL__?: string }).__VITE_OLLAMA_MODEL__) ||
    (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_OLLAMA_MODEL) ||
    'llama3.2'
  );
}

async function getAvailableModelNames(timeoutMs = 5000): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!r.ok) return [];
    const data = (await r.json()) as { models?: Array<{ name: string }> };
    return (data.models ?? []).map((m) => m.name.split(':')[0]);
  } catch {
    return [];
  }
}

/** Resolve which model to use: preferred if available, else first fallback that exists. */
function resolveModel(available: string[]): string | null {
  const preferred = getPreferredModel();
  if (available.some((m) => m === preferred || m.startsWith(preferred))) return preferred;
  for (const f of FALLBACK_MODELS) {
    if (available.some((m) => m === f || m.startsWith(f))) return f;
  }
  return available[0] ?? null;
}

async function checkOllama(): Promise<boolean> {
  const available = await getAvailableModelNames();
  const model = resolveModel(available);
  if (model) {
    setActiveOllamaModel(model);
    return true;
  }
  setActiveOllamaModel(null);
  return false;
}

let cached: AIGenerator | null = null;
let lastCheck = 0;
const TTL_MS = 15_000;

/**
 * Returns the best available AI generator. Prefers Ollama when enabled and reachable.
 */
export async function getAIGenerator(): Promise<AIGenerator> {
  if (cached && Date.now() - lastCheck < TTL_MS) return cached;
  if (isOllamaEnabled() && (await checkOllama())) {
    cached = ollama;
  } else {
    cached = offline;
  }
  lastCheck = Date.now();
  return cached;
}

/**
 * Returns a user-facing message explaining why AI is unavailable and how to fix it.
 */
export function getAIUnavailableHint(): string {
  if (!isOllamaEnabled()) {
    return 'Enable AI: set VITE_OLLAMA_ENABLED=true in .env and restart the app.';
  }
  return '1) Install Ollama (ollama.com) 2) Run: ollama pull llama3.2 3) Start with CORS: OLLAMA_ORIGINS=* ollama serve';
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

export interface AIDiagnostics {
  ollamaEnabled: boolean;
  ollamaReachable: boolean;
  modelsAvailable: string[];
  selectedModel: string | null;
  errors: string[];
  hint: string;
}

/**
 * Run detailed diagnostics to help troubleshoot AI connection issues.
 * Returns step-by-step status of what's working and what's not.
 */
export async function getAIDiagnostics(): Promise<AIDiagnostics> {
  const errors: string[] = [];
  const diagnostics: AIDiagnostics = {
    ollamaEnabled: false,
    ollamaReachable: false,
    modelsAvailable: [],
    selectedModel: null,
    errors,
    hint: '',
  };

  // Step 1: Check if Ollama is enabled in config
  diagnostics.ollamaEnabled = isOllamaEnabled();
  if (!diagnostics.ollamaEnabled) {
    errors.push('AI is not enabled in configuration');
    errors.push('Set VITE_OLLAMA_ENABLED=true in .env and restart the app');
    diagnostics.hint = 'Enable AI: set VITE_OLLAMA_ENABLED=true in .env and restart the app.';
    return diagnostics;
  }

  // Step 2: Check if Ollama is reachable (with timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${OLLAMA_BASE}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      errors.push(`Ollama returned error: ${response.status}`);
      diagnostics.hint = 'Ollama is running but returned an error. Try restarting Ollama.';
      return diagnostics;
    }
    diagnostics.ollamaReachable = true;

    const data = (await response.json()) as { models?: Array<{ name: string }> };
    diagnostics.modelsAvailable = (data.models ?? []).map((m) => m.name.split(':')[0]);
  } catch (err) {
    errors.push('Cannot connect to Ollama at localhost:11434');
    errors.push('Make sure Ollama is installed and running');
    diagnostics.hint = '1) Install Ollama (ollama.com) 2) Run: ollama pull llama3.2 3) Start with CORS: OLLAMA_ORIGINS=* ollama serve';
    return diagnostics;
  }

  // Step 3: Check if we have any models
  if (diagnostics.modelsAvailable.length === 0) {
    errors.push('No AI models found');
    errors.push('Run: ollama pull llama3.2 (or another model)');
    diagnostics.hint = 'No models installed. Run: ollama pull llama3.2';
    return diagnostics;
  }

  // Step 4: Check if preferred or fallback model is available
  const preferred = getPreferredModel();
  const model = resolveModel(diagnostics.modelsAvailable);
  diagnostics.selectedModel = model;

  if (!model) {
    errors.push(`Preferred model "${preferred}" not found`);
    errors.push(`Available models: ${diagnostics.modelsAvailable.join(', ')}`);
    diagnostics.hint = `Install a compatible model: ollama pull llama3.2`;
    return diagnostics;
  }

  // All checks passed
  diagnostics.hint = `Ready to use! Model: ${model}`;
  return diagnostics;
}
