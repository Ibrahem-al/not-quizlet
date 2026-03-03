import { useCallback } from 'react';
import { useLanguageStore } from '../stores/languageStore';
import { translations, type TranslationKey } from '../i18n/translations';

/**
 * useTranslation hook for accessing translations
 * 
 * Usage:
 * const { t, language, setLanguage } = useTranslation();
 * 
 * // Simple translation
 * t('signIn')
 * 
 * // Translation with interpolation
 * t('cardCount', { count: 5 })
 */
export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const dir = useLanguageStore((state) => state.dir);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const translationSet = translations[language] || translations.en;
      let text = translationSet[key] || translations.en[key] || key;

      // Handle interpolation like {count}, {value}, etc.
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
        });
      }

      return text;
    },
    [language]
  );

  return {
    t,
    language,
    setLanguage,
    dir,
    isRTL: dir === 'rtl',
  };
}

export type { TranslationKey };
