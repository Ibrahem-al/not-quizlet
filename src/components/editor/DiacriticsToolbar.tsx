/**
 * Language-aware diacritics toolbar.
 * Self-manages visibility via useScriptDetection — just drop it next to an <EditorContent>.
 */

import { AnimatePresence, motion } from 'framer-motion';
import type { Editor } from '@tiptap/react';
import { useScriptDetection } from '../../hooks/useScriptDetection';
import type { DiacriticGroup } from '../../lib/diacritics';

interface DiacriticsToolbarProps {
  editor: Editor | null;
}

export function DiacriticsToolbar({ editor }: DiacriticsToolbarProps) {
  const config = useScriptDetection(editor);

  return (
    <AnimatePresence>
      {config && editor && (
        <motion.div
          className="diacritics-toolbar"
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
                    e.preventDefault(); // keep editor focused
                    editor.chain().focus().insertContent(btn.char).run();
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
