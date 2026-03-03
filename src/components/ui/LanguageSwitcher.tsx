import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import { useLanguageStore } from '../../stores/languageStore';
import { availableLanguages, type Language } from '../../i18n/translations';
import { useTranslation } from '../../hooks/useTranslation';

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, dir } = useLanguageStore();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = availableLanguages.find((l) => l.code === language) || availableLanguages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-[var(--radius-button)] 
                   bg-[var(--color-surface-muted)] hover:bg-[var(--color-primary-muted)]
                   text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]
                   border border-[var(--color-border)] hover:border-[var(--color-primary)]/30
                   transition-colors duration-[var(--duration-fast)]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('language')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={t('language')}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <Globe className="w-5 h-5" />
        </motion.div>
        {/* Active language indicator */}
        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full text-[10px] flex items-center justify-center shadow-sm">
          {currentLang.flag}
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-full mt-2 py-2 min-w-[180px] 
                       rounded-[var(--radius-card)] bg-[var(--color-surface)] 
                       border border-[var(--color-border)] shadow-[var(--shadow-modal)] z-50`}
            role="listbox"
            aria-label={t('language')}
          >
            <div className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              {t('language')}
            </div>
            {availableLanguages.map((lang) => (
              <motion.button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between gap-3
                           hover:bg-[var(--color-surface-muted)] transition-colors
                           ${language === lang.code ? 'bg-[var(--color-primary-muted)]/50 text-[var(--color-primary)]' : 'text-[var(--color-text)]'}
                           ${lang.code === 'ar' ? 'font-sans' : ''}`}
                role="option"
                aria-selected={language === lang.code}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{lang.flag}</span>
                  <span className={lang.code === 'ar' ? 'font-sans' : ''}>{lang.name}</span>
                </span>
                {language === lang.code && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Check className="w-4 h-4 text-[var(--color-primary)]" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
