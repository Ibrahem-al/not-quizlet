/**
 * Detects the script/language of the current paragraph in a TipTap editor
 * and returns the matching ScriptToolbarConfig (or null).
 */

import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { detectScript, type ScriptToolbarConfig } from '../lib/diacritics';

export function useScriptDetection(editor: Editor | null): ScriptToolbarConfig | null {
  const [config, setConfig] = useState<ScriptToolbarConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor) {
      setConfig(null);
      return;
    }

    const check = () => {
      // Clear any pending debounce
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        try {
          const { $from } = editor.state.selection;
          const text = editor.state.doc.textBetween($from.start(), $from.end());
          setConfig(detectScript(text));
        } catch {
          setConfig(null);
        }
      }, 50);
    };

    editor.on('update', check);
    editor.on('selectionUpdate', check);

    // Run initial check
    check();

    return () => {
      editor.off('update', check);
      editor.off('selectionUpdate', check);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [editor]);

  return config;
}
