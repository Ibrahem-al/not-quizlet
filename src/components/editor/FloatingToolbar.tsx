/**
 * Contextual floating toolbar on text selection (Bold, Italic, Code, Highlight).
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bold, Italic, Code, Highlighter } from 'lucide-react';
import type { Editor } from '@tiptap/core';

interface FloatingToolbarProps {
  editor: Editor | null;
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);

  const updatePos = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      setVisible(false);
      setPos(null);
      return;
    }
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    setPos({
      x: (start.left + end.left) / 2 - 80,
      y: start.top - 48,
    });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on('selectionUpdate', updatePos);
    editor.on('transaction', updatePos);
    return () => {
      editor.off('selectionUpdate', updatePos);
      editor.off('transaction', updatePos);
    };
  }, [editor, updatePos]);

  if (!editor) return null;

  const run = (fn: () => void) => {
    fn();
    editor.commands.focus();
  };

  const toolbar = (
    <AnimatePresence>
      {visible && pos && (
        <motion.div
          className="studio-floating-toolbar fixed z-50 flex items-center gap-0.5 rounded-lg py-1 px-1"
          style={{ left: pos.x, top: pos.y }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={spring}
        >
          <button
            type="button"
            onClick={() => run(() => editor.chain().focus().toggleBold().run())}
            className="p-2 rounded"
            data-active={editor.isActive('bold') ? 'true' : undefined}
            title="Bold (⌘B)"
            aria-label="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
            className="p-2 rounded"
            data-active={editor.isActive('italic') ? 'true' : undefined}
            title="Italic (⌘I)"
            aria-label="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => run(() => editor.chain().focus().toggleCode().run())}
            className="p-2 rounded"
            data-active={editor.isActive('code') ? 'true' : undefined}
            title="Code"
            aria-label="Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => run(() => editor.chain().focus().toggleHighlight().run())}
            className="p-2 rounded"
            data-active={editor.isActive('highlight') ? 'true' : undefined}
            title="Highlight"
            aria-label="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const container = editor.view.dom.closest('.studio-card') ?? document.body;
  return createPortal(toolbar, container as HTMLElement);
}
