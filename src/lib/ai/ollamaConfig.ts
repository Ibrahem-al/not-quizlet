/**
 * Shared config for Ollama: which model to use. Set by getGenerator when it verifies availability.
 */
let activeModel: string | null = null;

export function setActiveOllamaModel(model: string | null): void {
  activeModel = model;
}

export function getActiveOllamaModel(): string {
  return activeModel ?? 'llama3.2';
}
