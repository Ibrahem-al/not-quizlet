/**
 * Inline card: term | definition. Always visible border/surface so each card is distinguishable.
 * Labels for Term / Definition; hover toolbar: drag, image, AI suggest, delete.
 * Keyboard: Enter, Tab, Escape, Backspace.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { motion } from 'framer-motion';
import { GripVertical, ImagePlus, Sparkles, Trash2 } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { getEditorExtensions } from '../../lib/editorExtensions';
import type { SetPattern } from '../../lib/ContextAnalyzer';
import { getAIGenerator } from '../../lib/ai';
import { stripHtml } from '../../lib/validation';
import type { Card } from '../../types';
import { ImageSearchModal } from '../editor/ImageSearchModal';
import { sanitizeSearchQuery } from '../../lib/imageSearch';
import '../../styles/editor.css';

const TERM_PLACEHOLDER = 'Ask a question...';
const DEF_PLACEHOLDER = 'Definition or translation...';

interface EditableCardProps {
  card: Card;
  pattern: SetPattern;
  canSuggest: boolean;
  onUpdate: (updates: Partial<Card>) => void;
  onDelete: () => void;
  onEnterInDefinition: () => void;
  onFocusNextCard: () => void;
  onFocusPrevCard?: () => void;
  dragHandleProps?: Record<string, unknown>;
  /** When equal to card index, focus the term field (e.g. after adding new card or Tab from previous). */
  focusedCardIndex?: number | null;
  cardIndex: number;
}

export function EditableCard({
  card,
  pattern,
  canSuggest,
  onUpdate,
  onDelete,
  onEnterInDefinition,
  onFocusNextCard,
  onFocusPrevCard: _onFocusPrevCard,
  dragHandleProps,
  focusedCardIndex,
  cardIndex,
}: EditableCardProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiBadge, setShowAiBadge] = useState(false);
  const defWrapperRef = useRef<HTMLDivElement>(null);

  const syncTerm = useCallback((html: string) => onUpdate({ term: html }), [onUpdate]);
  const syncDef = useCallback((html: string) => onUpdate({ definition: html }), [onUpdate]);

  const termEditor = useEditor({
    extensions: getEditorExtensions(TERM_PLACEHOLDER),
    content: card.term || '<p></p>',
    onUpdate: ({ editor }) => syncTerm(editor.getHTML()),
    immediatelyRender: false,
    editorProps: { attributes: { class: 'inline-editor' } },
  }, [card.id]);

  const defEditor = useEditor({
    extensions: getEditorExtensions(DEF_PLACEHOLDER),
    content: card.definition || '<p></p>',
    onUpdate: ({ editor }) => {
      syncDef(editor.getHTML());
      setAiSuggestion('');
    },
    immediatelyRender: false,
    editorProps: { attributes: { class: 'inline-editor' } },
  }, [card.id]);

  useEffect(() => {
    if (termEditor && card.term !== termEditor.getHTML()) {
      termEditor.commands.setContent(card.term || '<p></p>', { emitUpdate: false });
    }
  }, [card.term, termEditor]);

  useEffect(() => {
    if (focusedCardIndex === cardIndex && termEditor) {
      setTimeout(() => termEditor.commands.focus(), 50);
    }
  }, [focusedCardIndex, cardIndex, termEditor]);
  useEffect(() => {
    if (defEditor && card.definition !== defEditor.getHTML()) {
      defEditor.commands.setContent(card.definition || '<p></p>', { emitUpdate: false });
    }
  }, [card.definition, defEditor]);

  const termPlain = stripHtml(card.term).trim();
  const defPlain = stripHtml(card.definition).trim();
  const defEmpty = defPlain.length === 0;

  const fetchSuggestion = useDebouncedCallback(async () => {
    if (!canSuggest || !termPlain || !defEmpty || !defEditor) return;
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const ai = await getAIGenerator();
      const result = await ai.generateDefinition(termPlain, pattern.subjectDomain);
      if (result && defPlain === '' && defEditor) {
        setAiSuggestion(result);
        setShowAiBadge(true);
        setTimeout(() => setShowAiBadge(false), 2000);
      }
    } catch {
      setAiSuggestion('');
    } finally {
      setAiLoading(false);
    }
  }, 800);

  useEffect(() => {
    if (termPlain && defEmpty && canSuggest) fetchSuggestion();
    else setAiSuggestion('');
  }, [termPlain, defEmpty, canSuggest, fetchSuggestion]);

  useEffect(() => {
    if (!defEditor) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onEnterInDefinition();
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        if (aiSuggestion) {
          e.preventDefault();
          defEditor.commands.setContent(`<p>${aiSuggestion}</p>`, { emitUpdate: true });
          syncDef(`<p>${aiSuggestion}</p>`);
          setAiSuggestion('');
        } else {
          onFocusNextCard();
        }
      }
      if (e.key === 'Escape') {
        defEditor.commands.blur();
      }
    };
    defEditor.view.dom.addEventListener('keydown', onKeyDown);
    return () => defEditor.view.dom.removeEventListener('keydown', onKeyDown);
  }, [defEditor, onEnterInDefinition, onFocusNextCard, aiSuggestion, syncDef]);

  useEffect(() => {
    if (!termEditor) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        defEditor?.commands.focus();
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        defEditor?.commands.focus();
      }
      if (e.key === 'Backspace') {
        const { from, to } = termEditor.state.selection;
        const text = termEditor.state.doc.textBetween(0, termEditor.state.doc.content.size);
        if (text.trim() === '' && from === 0 && to === 0) {
          e.preventDefault();
          onDelete();
        }
      }
      if (e.key === 'Escape') termEditor.commands.blur();
    };
    termEditor.view.dom.addEventListener('keydown', onKeyDown);
    return () => termEditor.view.dom.removeEventListener('keydown', onKeyDown);
  }, [termEditor, defEditor, onDelete]);

  return (
    <motion.li
      layout
      className="group/card relative rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:border-[var(--color-text-secondary)]/25 focus-within:border-[var(--color-border-focus)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]/20 transition-colors duration-[var(--duration-fast)]"
    >
      <div className="flex items-stretch min-h-[52px]">
        {dragHandleProps && (
          <div
            className="flex items-center pl-1 pr-2 opacity-60 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-[var(--color-text-secondary)]"
            {...dragHandleProps}
            aria-hidden
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 grid grid-cols-[1fr_1fr] gap-2 min-w-0">
          <div
            className="min-h-[44px] px-3 py-2 rounded-l-md focus-within:bg-[var(--color-background)]/50"
            data-term-pane
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1" aria-hidden>
              Term
            </span>
            <div className="min-h-[36px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 focus-within:border-[var(--color-border-focus)] transition-colors duration-[var(--duration-fast)]">
              <EditorContent editor={termEditor} />
            </div>
          </div>
          <div
            ref={defWrapperRef}
            className="relative min-h-[44px] px-3 py-2 rounded-r-md focus-within:bg-[var(--color-background)]/50"
            data-def-pane
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1" aria-hidden>
              Definition
            </span>
            {aiSuggestion && defEmpty && (
              <span
                className="pointer-events-none absolute left-3 top-2 right-3 text-[var(--color-text-secondary)] opacity-50 italic text-sm"
                aria-hidden
              >
                {aiSuggestion}
              </span>
            )}
            {showAiBadge && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-primary)] animate-pulse">
                AI
              </span>
            )}
            <div className="min-h-[36px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 focus-within:border-[var(--color-border-focus)] transition-colors duration-[var(--duration-fast)]">
              <EditorContent editor={defEditor} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 pr-2 opacity-60 group-hover/card:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className="p-1.5 rounded text-[var(--color-text-secondary)] hover:bg-black/5 hover:text-[var(--color-text)]"
            title="Add image"
            aria-label="Add image"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          {canSuggest && defEmpty && (
            <button
              type="button"
              onClick={() => fetchSuggestion()}
              disabled={aiLoading}
              className="p-1.5 rounded text-[var(--color-text-secondary)] hover:bg-black/5 hover:text-[var(--color-primary)]"
              title="AI suggest definition"
              aria-label="AI suggest"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
            title="Delete card"
            aria-label="Delete card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <ImageSearchModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onSelect={(base64) => {
          defEditor?.chain().focus().insertContent(`<img src="${base64}" alt="" />`).run();
          setImageModalOpen(false);
        }}
        initialQuery={sanitizeSearchQuery(card.term || '')}
      />
    </motion.li>
  );
}
