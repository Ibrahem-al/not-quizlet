import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'ar' | 'es';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  dir: 'ltr' | 'rtl';
}

export const RTL_LANGUAGES: Language[] = ['ar'];

export function isRTL(language: Language): boolean {
  return RTL_LANGUAGES.includes(language);
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      dir: 'ltr',

      setLanguage: (language) => {
        const dir = isRTL(language) ? 'rtl' : 'ltr';
        set({ language, dir });
        // Apply direction to document
        document.documentElement.dir = dir;
        document.documentElement.lang = language;
      },
    }),
    {
      name: 'studyflow-language',
      partialize: (state) => ({ language: state.language }),
    }
  )
);

// Initialize language on app start
export function initLanguage() {
  const stored = localStorage.getItem('studyflow-language');
  if (stored) {
    try {
      const { language } = JSON.parse(stored);
      const dir = isRTL(language as Language) ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.lang = language;
    } catch {
      // ignore parse errors
    }
  }
}
