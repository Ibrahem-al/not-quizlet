/**
 * Badge showing error count; hover shows tooltip list; click scrolls to first error.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import type { ValidationError } from '../../lib/validation';

interface ValidationBadgeProps {
  count: number;
  errors: ValidationError[];
  /** Card ID or element ID to scroll to when "Go to first" is clicked */
  scrollTargetId?: string;
  className?: string;
}

export function ValidationBadge({ count, errors, scrollTargetId, className = '' }: ValidationBadgeProps) {
  const [hover, setHover] = useState(false);

  const handleClick = () => {
    if (scrollTargetId) {
      const el = document.getElementById(scrollTargetId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (count === 0) return null;

  const hardCount = errors.filter((e) => e.severity === 'hard').length;

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <motion.button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1 rounded-full bg-[var(--color-danger)] text-white text-xs font-medium px-2 py-1 shadow-sm hover:opacity-90"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        aria-label={`${count} validation error(s). Click to go to first.`}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{count}</span>
      </motion.button>
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-1 z-50 min-w-[200px] max-w-[280px] rounded-lg bg-[var(--color-text)] text-[var(--color-surface)] text-xs shadow-xl p-2"
          >
            {hardCount > 0 && (
              <p className="text-[var(--color-danger)] font-medium mb-1">
                Fix {hardCount} error(s) to save
              </p>
            )}
            <ul className="space-y-0.5">
              {errors.slice(0, 5).map((e, i) => (
                <li key={i} className="truncate">
                  {e.message}
                </li>
              ))}
              {errors.length > 5 && (
                <li className="text-[var(--color-text-secondary)]">
                  +{errors.length - 5} more
                </li>
              )}
            </ul>
            {scrollTargetId && (
              <button
                type="button"
                onClick={handleClick}
                className="mt-2 text-[var(--color-primary)] hover:underline text-left"
              >
                Go to first error
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
