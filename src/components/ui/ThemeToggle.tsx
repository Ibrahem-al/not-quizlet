import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-10 h-10 rounded-[var(--radius-button)] 
                 bg-[var(--color-surface-muted)] hover:bg-[var(--color-primary-muted)]
                 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]
                 border border-[var(--color-border)] hover:border-[var(--color-primary)]/30
                 transition-colors duration-[var(--duration-fast)]"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: isDark ? 360 : 0,
          scale: isDark ? 1 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
      >
        {isDark ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </motion.div>
      
      {/* Glow effect for dark mode */}
      {isDark && (
        <motion.div
          layoutId="themeGlow"
          className="absolute inset-0 rounded-[var(--radius-button)] bg-[var(--color-primary)]/10 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.button>
  );
}
