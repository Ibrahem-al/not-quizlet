/**
 * Script-aware diacritics config registry.
 * Extensible: add a new language by pushing a config to SCRIPT_CONFIGS.
 */

export interface DiacriticButton {
  /** Display label (visible on button, e.g. "ـَ") */
  label: string;
  /** Unicode character(s) to insert at cursor */
  char: string;
  /** Accessible / tooltip name (e.g. "Fatha") */
  name: string;
}

export interface DiacriticGroup {
  groupLabel: string;
  buttons: DiacriticButton[];
}

export interface ScriptToolbarConfig {
  id: string;
  displayName: string;
  /** Regex tested against current paragraph text to trigger toolbar */
  detectPattern: RegExp;
  groups: DiacriticGroup[];
}

/* ── Arabic ─────────────────────────────────────────────── */

const TATWEEL = '\u0640'; // ـ  (base for combining mark display)

const arabicConfig: ScriptToolbarConfig = {
  id: 'arabic',
  displayName: 'Arabic Diacritics',
  detectPattern: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/,
  groups: [
    {
      groupLabel: 'Short Vowels',
      buttons: [
        { label: `${TATWEEL}\u064E`, char: '\u064E', name: 'Fatha' },
        { label: `${TATWEEL}\u0650`, char: '\u0650', name: 'Kasra' },
        { label: `${TATWEEL}\u064F`, char: '\u064F', name: 'Damma' },
        { label: `${TATWEEL}\u0652`, char: '\u0652', name: 'Sukun' },
      ],
    },
    {
      groupLabel: 'Shaddah',
      buttons: [
        { label: `${TATWEEL}\u0651`, char: '\u0651', name: 'Shaddah' },
      ],
    },
    {
      groupLabel: 'Tanwin',
      buttons: [
        { label: `${TATWEEL}\u064B`, char: '\u064B', name: 'Fathatan' },
        { label: `${TATWEEL}\u064D`, char: '\u064D', name: 'Kasratan' },
        { label: `${TATWEEL}\u064C`, char: '\u064C', name: 'Dammatan' },
      ],
    },
  ],
};

/* ── Registry ───────────────────────────────────────────── */

export const SCRIPT_CONFIGS: ScriptToolbarConfig[] = [arabicConfig];

/**
 * Return the first matching script config for the given text, or null.
 */
export function detectScript(text: string): ScriptToolbarConfig | null {
  for (const config of SCRIPT_CONFIGS) {
    if (config.detectPattern.test(text)) return config;
  }
  return null;
}

/* ── Arabic diacritics comparison helpers ──────────────────── */

/** Broad range of Arabic combining diacritical marks */
const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0610-\u061A\u0670]/g;

/** Vowel-class diacritics (mutually exclusive per character position) */
const VOWEL_DIACRITICS = new Set([
  '\u064B', // Fathatan
  '\u064C', // Dammatan
  '\u064D', // Kasratan
  '\u064E', // Fatha
  '\u064F', // Damma
  '\u0650', // Kasra
  '\u0652', // Sukun
]);

export function isArabicDiacritic(char: string): boolean {
  return /^[\u064B-\u065F\u0610-\u061A\u0670]$/.test(char);
}

/** Strip all Arabic combining diacritics from a string. */
export function stripArabicDiacritics(str: string): string {
  return str.replace(ARABIC_DIACRITICS_RE, '');
}

interface ParsedChar {
  base: string;
  diacritics: string[];
}

/**
 * Parse a string into base characters with their associated combining diacritics.
 */
export function parseArabicChars(str: string): ParsedChar[] {
  const result: ParsedChar[] = [];
  for (const char of str) {
    if (isArabicDiacritic(char)) {
      if (result.length > 0) {
        result[result.length - 1].diacritics.push(char);
      }
    } else {
      result.push({ base: char, diacritics: [] });
    }
  }
  return result;
}

/** Get the vowel-class diacritic from a set of diacritics, or null. */
function getVowel(diacritics: string[]): string | null {
  for (const d of diacritics) {
    if (VOWEL_DIACRITICS.has(d)) return d;
  }
  return null;
}

/**
 * Compare two strings with Arabic diacritics tolerance:
 * - Both have a vowel mark at the same position → must match
 * - Only one side has a vowel mark → OK (no penalty for extra or missing)
 * - Shadda is binary (present/absent) — never penalized since "wrong shadda" can't exist
 */
export function compareWithDiacriticsTolerance(a: string, b: string): boolean {
  const aParsed = parseArabicChars(a);
  const bParsed = parseArabicChars(b);
  const len = Math.min(aParsed.length, bParsed.length);

  for (let i = 0; i < len; i++) {
    const aVowel = getVowel(aParsed[i].diacritics);
    const bVowel = getVowel(bParsed[i].diacritics);

    // Both have a vowel mark → must be the same
    if (aVowel !== null && bVowel !== null && aVowel !== bVowel) {
      return false;
    }
  }
  return true;
}
