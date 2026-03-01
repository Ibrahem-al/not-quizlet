/**
 * Ollama adapter: local LLM at localhost:11434.
 * No API key; requires Ollama running with CORS (OLLAMA_ORIGINS=* ollama serve).
 */

import type { AIGenerator, QuizQuestion, MagicCreateResult, GeneratedCard } from '../types';
import type { Card } from '../../../types';

const OLLAMA_BASE = 'http://localhost:11434';

async function ollamaGenerate(
  prompt: string,
  options?: { system?: string; json?: boolean }
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      prompt,
      stream: false,
      system: options?.system,
      format: options?.json ? 'json' : undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Ollama error ${res.status}`);
  }
  const data = (await res.json()) as { response?: string };
  return (data.response ?? '').trim();
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export class OllamaAdapter implements AIGenerator {
  readonly name = 'Ollama';
  readonly available = true;

  async generateDefinition(term: string, context?: string): Promise<string | null> {
    try {
      const prompt = context
        ? `Define "${term}" in one clear sentence (context: ${context}). Reply with only the definition, no quotes.`
        : `Define "${term}" in one clear sentence. Reply with only the definition, no quotes.`;
      const out = await ollamaGenerate(prompt);
      return out || null;
    } catch {
      return null;
    }
  }

  async generateMnemonic(term: string, definition: string): Promise<string | null> {
    try {
      const prompt = `Create a short mnemonic to remember: "${term}" = ${definition}. One sentence only.`;
      const out = await ollamaGenerate(prompt);
      return out || null;
    } catch {
      return null;
    }
  }

  async generateQuestions(content: string): Promise<QuizQuestion[]> {
    try {
      const prompt = `Based on this content, generate 3 quiz questions as JSON array. Each: { "type": "multiple_choice" or "true_false", "question": "...", "options": ["A","B","C"] for MC, "correctAnswer": "...", "explanation": "..." }. Content:\n${content.slice(0, 2000)}`;
      const out = await ollamaGenerate(prompt, { json: true });
      const arr = safeJson<QuizQuestion[]>(out, []);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  async explainConcept(query: string, cardContext: Card): Promise<string | null> {
    try {
      const prompt = `Explain briefly: ${query}\n(Relevant card: term="${cardContext.term}", definition="${cardContext.definition}"). Reply in 2-4 sentences.`;
      const out = await ollamaGenerate(prompt);
      return out || null;
    } catch {
      return null;
    }
  }

  async magicCreate(topic: string, count = 7): Promise<MagicCreateResult | null> {
    try {
      const prompt = `Generate exactly ${count} flashcards for the topic "${topic}". Reply with a single JSON object: { "cards": [ { "term": "...", "definition": "...", "mnemonic": "..." } ], "suggestedTags": ["tag1","tag2"] }. Only valid JSON, no markdown.`;
      const out = await ollamaGenerate(prompt, { json: true });
      const parsed = safeJson<MagicCreateResult>(out, { cards: [], suggestedTags: [] });
      if (parsed.cards && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
        return {
          cards: parsed.cards.slice(0, count),
          suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [topic],
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async extractCardsFromText(text: string): Promise<GeneratedCard[] | null> {
    try {
      const prompt = `Extract flashcard pairs from this text. Reply with a JSON array: [ { "term": "...", "definition": "..." } ]. Only valid JSON. Text:\n${text.slice(0, 4000)}`;
      const out = await ollamaGenerate(prompt, { json: true });
      const arr = safeJson<GeneratedCard[]>(out, []);
      return Array.isArray(arr) && arr.length > 0 ? arr : null;
    } catch {
      return null;
    }
  }
}
