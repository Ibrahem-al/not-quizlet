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
