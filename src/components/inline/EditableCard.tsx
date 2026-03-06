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
import { stripHtml, type ValidationError } from '../../lib/validation';
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
  validationErrors?: ValidationError[];
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
  validationErrors = [],
}: EditableCardProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageTarget, setImageTarget] = useState<'term' | 'definition' | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiBadge, setShowAiBadge] = useState(false);
  const defWrapperRef = useRef<HTMLDivElement>(null);

  const openImageModal = (target: 'term' | 'definition') => {
    setImageTarget(target);
    setImageModalOpen(true);
  };

  const hasErrors = validationErrors.length > 0;
  const hardErrors = validationErrors.filter(e => e.severity === 'hard');
  const termErrors = hardErrors.filter(e => !e.field || e.field === 'term' || e.code === 'EMPTY_TERM_CONTENT');
  const defErrors = hardErrors.filter(e => e.field === 'definition' || e.code === 'EMPTY_DEFINITION_CONTENT');

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
      className={`group/card relative rounded-[var(--radius-card)] border ${hasErrors ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'} bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:border-[var(--color-text-secondary)]/25 focus-within:border-[var(--color-border-focus)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]/20 transition-colors duration-[var(--duration-fast)]`}
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
            className={`min-h-[44px] px-3 py-2 rounded-l-md focus-within:bg-[var(--color-background)]/50 ${termErrors.length > 0 ? 'bg-[var(--color-danger)]/5' : ''}`}
            data-term-pane
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`block text-[10px] font-semibold uppercase tracking-wider ${termErrors.length > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`} aria-hidden>
                Term {termErrors.length > 0 && '(required)'}
              </span>
              <button
                type="button"
                onClick={() => openImageModal('term')}
                className="p-1 rounded text-[var(--color-text-secondary)] hover:bg-black/5 hover:text-[var(--color-text)] opacity-0 group-hover/card:opacity-100 transition-opacity"
                title="Add image to term"
                aria-label="Add image to term"
              >
                <ImagePlus className="w-3 h-3" />
              </button>
            </div>
            <div className={`min-h-[36px] rounded-[var(--radius-button)] border ${termErrors.length > 0 ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'} bg-[var(--color-surface)] px-2.5 py-1.5 focus-within:border-[var(--color-border-focus)] transition-colors duration-[var(--duration-fast)]`}>
              <EditorContent editor={termEditor} />
            </div>
          </div>
          <div
            ref={defWrapperRef}
            className={`relative min-h-[44px] px-3 py-2 rounded-r-md focus-within:bg-[var(--color-background)]/50 ${defErrors.length > 0 ? 'bg-[var(--color-danger)]/5' : ''}`}
            data-def-pane
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`block text-[10px] font-semibold uppercase tracking-wider ${defErrors.length > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`} aria-hidden>
                Definition {defErrors.length > 0 && '(required)'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openImageModal('definition')}
                  className="p-1 rounded text-[var(--color-text-secondary)] hover:bg-black/5 hover:text-[var(--color-text)] opacity-0 group-hover/card:opacity-100 transition-opacity"
                  title="Add image to definition"
                  aria-label="Add image to definition"
                >
                  <ImagePlus className="w-3 h-3" />
                </button>
                {showAiBadge && (
                  <span className="text-[10px] text-[var(--color-primary)] animate-pulse">
                    AI
                  </span>
                )}
              </div>
            </div>
            {aiSuggestion && defEmpty && (
              <span
                className="pointer-events-none absolute left-3 top-2 right-3 text-[var(--color-text-secondary)] opacity-50 italic text-sm"
                aria-hidden
              >
                {aiSuggestion}
              </span>
            )}
            <div className={`min-h-[36px] rounded-[var(--radius-button)] border ${defErrors.length > 0 ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'} bg-[var(--color-surface)] px-2.5 py-1.5 focus-within:border-[var(--color-border-focus)] transition-colors duration-[var(--duration-fast)]`}>
              <EditorContent editor={defEditor} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 pr-2 opacity-60 group-hover/card:opacity-100 transition-opacity">
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
      {hardErrors.length > 0 && (
        <div className="px-3 py-2 bg-[var(--color-danger)]/5 border-t border-[var(--color-danger)]/20">
          <div className="flex flex-col gap-1">
            {hardErrors.map((error, idx) => (
              <span key={idx} className="text-xs text-[var(--color-danger)]">
                {error.message}
              </span>
            ))}
          </div>
        </div>
      )}
      <ImageSearchModal
        open={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setImageTarget(null);
        }}
        onSelect={(base64) => {
          const targetEditor = imageTarget === 'term' ? termEditor : defEditor;
          targetEditor?.chain().focus().insertContent(`<img src="${base64}" alt="" />`).run();
          setImageModalOpen(false);
          setImageTarget(null);
        }}
        initialQuery={sanitizeSearchQuery(card.term || '')}
      />
    </motion.li>
  );
}
