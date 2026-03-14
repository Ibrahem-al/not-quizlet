/**
 * Diacritics toolbar for plain <input> elements.
 * Auto-shows when the input value contains script-specific characters (e.g., Arabic).
 */

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { detectScript } from '../../lib/diacritics';
import type { DiacriticGroup } from '../../lib/diacritics';

interface InputDiacriticsToolbarProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onValueChange: (newValue: string) => void;
}

export function InputDiacriticsToolbar({ inputRef, value, onValueChange }: InputDiacriticsToolbarProps) {
  const config = useMemo(() => detectScript(value), [value]);

  return (
    <AnimatePresence>
      {config && (
        <motion.div
          className="diacritics-toolbar diacritics-toolbar--input"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {config.groups.map((group: DiacriticGroup, gi: number) => (
            <div key={group.groupLabel} className="diacritics-toolbar-group">
              {gi > 0 && <div className="diacritics-toolbar-divider" aria-hidden />}
              {group.buttons.map((btn) => (
                <button
                  key={btn.name}
                  type="button"
                  className="diacritics-btn"
                  title={btn.name}
                  aria-label={btn.name}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep input focused
                    const input = inputRef.current;
                    if (!input || input.disabled) return;
                    const start = input.selectionStart ?? value.length;
                    const end = input.selectionEnd ?? value.length;
                    const newValue = value.slice(0, start) + btn.char + value.slice(end);
                    onValueChange(newValue);
                    // Restore cursor position after React re-render
                    requestAnimationFrame(() => {
                      const pos = start + btn.char.length;
                      input.setSelectionRange(pos, pos);
                    });
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
