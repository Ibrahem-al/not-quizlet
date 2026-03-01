/**
 * Smart import: parse pasted text into term/definition pairs.
 * Supports: "term - definition", "term: definition", tab-separated, numbered lines.
 */
export interface ParsedCard {
  term: string;
  definition: string;
}

export function parseImportText(text: string): ParsedCard[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const result: ParsedCard[] = [];

  for (const line of lines) {
    // Numbered: "1. term - definition" or "1) term - definition"
    const numbered = line.replace(/^\s*\d+[.)]\s*/, '');
    // Tab-separated
    if (numbered.includes('\t')) {
      const [term, definition] = numbered.split('\t').map((s) => s.trim());
      if (term && definition) result.push({ term, definition });
      continue;
    }
    // "term - definition"
    if (numbered.includes(' - ')) {
      const idx = numbered.indexOf(' - ');
      const term = numbered.slice(0, idx).trim();
      const definition = numbered.slice(idx + 3).trim();
      if (term && definition) result.push({ term, definition });
      continue;
    }
    // "term: definition"
    if (numbered.includes(': ')) {
      const idx = numbered.indexOf(': ');
      const term = numbered.slice(0, idx).trim();
      const definition = numbered.slice(idx + 2).trim();
      if (term && definition) result.push({ term, definition });
      continue;
    }
  }
  return result;
}
