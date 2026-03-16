/**
 * Inline card: term | definition. Always visible border/surface so each card is distinguishable.
 * Labels for Term / Definition; hover toolbar: drag, image, AI suggest, delete.
 * Keyboard: Enter, Tab, Escape, Backspace.
 *
 * Performance: TipTap editors are only mounted when the card is focused (isEditing=true).
 * Non-focused cards render lightweight static HTML previews instead.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { GripVertical, ImagePlus, Sparkles, Trash2 } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { getEditorExtensions } from '../../lib/editorExtensions';
import type { SetPattern } from '../../lib/ContextAnalyzer';
import { getAIGenerator } from '../../lib/ai';
import { stripHtml, type ValidationError } from '../../lib/validation';
import { addLazyLoading } from '../../lib/contentHelpers';
import type { Card } from '../../types';
import { ImageSearchModal } from '../editor/ImageSearchModal';
import { DiacriticsToolbar } from '../editor/DiacriticsToolbar';
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
  focusedCardIndex?: number | null;
  cardIndex: number;
  validationErrors?: ValidationError[];
}

/* ─── Static content for a single pane ─── */

function StaticPane({ html, placeholder, hasErrors }: { html: string; placeholder: string; hasErrors: boolean }) {
  const isEmpty = !html || (stripHtml(html).trim() === '' && !html.includes('<img'));
  const lazyHtml = useMemo(() => isEmpty ? '' : addLazyLoading(html), [html, isEmpty]);
  return (
    <div className={`min-h-[36px] rounded-[var(--radius-button)] border ${hasErrors ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'} bg-[var(--color-surface)] px-2.5 py-1.5 cursor-text transition-colors duration-[var(--duration-fast)]`}>
      {isEmpty ? (
        <p className="inline-editor text-[var(--color-text-secondary)]/50 text-sm italic">{placeholder}</p>
      ) : (
        <div
          className="inline-editor study-content"
          dangerouslySetInnerHTML={{ __html: lazyHtml }}
        />
      )}
    </div>
  );
}

/* ─── Active TipTap editors (child component, only mounted when isEditing) ─── */

interface ActiveEditorsProps {
  card: Card;
  onUpdate: (updates: Partial<Card>) => void;
  onDelete: () => void;
  onEnterInDefinition: () => void;
  onFocusNextCard: () => void;
  autoFocusTerm: boolean;
  aiSuggestion: string;
  setAiSuggestion: (s: string) => void;
  termErrors: ValidationError[];
  defErrors: ValidationError[];
  editorRefsCallback: (term: ReturnType<typeof useEditor> | null, def: ReturnType<typeof useEditor> | null) => void;
  openImageModal: (target: 'term' | 'definition') => void;
  showAiBadge: boolean;
  defEmpty: boolean;
}

function ActiveEditors({
  card,
  onUpdate,
  onDelete,
  onEnterInDefinition,
  onFocusNextCard,
  autoFocusTerm,
  aiSuggestion,
  setAiSuggestion,
  termErrors,
  defErrors,
  editorRefsCallback,
  openImageModal,
  showAiBadge,
  defEmpty,
}: ActiveEditorsProps) {
  const syncTerm = useCallback((html: string) => onUpdate({ term: html }), [onUpdate]);
  const syncDef = useCallback((html: string) => onUpdate({ definition: html }), [onUpdate]);
  // Refs to hold latest values for flush-on-unmount (avoids stale closures in cleanup)
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

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

  // Keep editor refs up to date for flush-on-unmount
  const termEditorRef = useRef(termEditor);
  termEditorRef.current = termEditor;
  const defEditorRef = useRef(defEditor);
  defEditorRef.current = defEditor;

  // CRITICAL: Flush editor content to parent state before unmounting.
  // This prevents data loss when the user clicks away and editors are destroyed.
  useEffect(() => {
    return () => {
      const term = termEditorRef.current;
      const def = defEditorRef.current;
      if (!term && !def) return;
      const updates: Partial<Card> = {};
      if (term && !term.isDestroyed) updates.term = term.getHTML();
      if (def && !def.isDestroyed) updates.definition = def.getHTML();
      if (updates.term !== undefined || updates.definition !== undefined) {
        onUpdateRef.current(updates);
      }
    };
  }, []); // Empty deps: runs cleanup only on unmount

  // Expose editors to parent for image insertion; clean up on unmount
  useEffect(() => {
    editorRefsCallback(termEditor, defEditor);
    return () => editorRefsCallback(null, null);
  }, [termEditor, defEditor, editorRefsCallback]);

  // Sync content from parent if it changes externally
  useEffect(() => {
    if (termEditor && card.term !== termEditor.getHTML()) {
      termEditor.commands.setContent(card.term || '<p></p>', { emitUpdate: false });
    }
  }, [card.term, termEditor]);

  useEffect(() => {
    if (defEditor && card.definition !== defEditor.getHTML()) {
      defEditor.commands.setContent(card.definition || '<p></p>', { emitUpdate: false });
    }
  }, [card.definition, defEditor]);

  // Auto-focus term on mount when requested
  useEffect(() => {
    if (autoFocusTerm && termEditor) {
      setTimeout(() => termEditor.commands.focus(), 50);
    }
  }, [autoFocusTerm, termEditor]);

  // Keyboard: definition pane
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
  }, [defEditor, onEnterInDefinition, onFocusNextCard, aiSuggestion, syncDef, setAiSuggestion]);

  // Keyboard: term pane
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
    <div className="flex-1 grid grid-cols-[1fr_1fr] gap-2 min-w-0">
      {/* Term pane */}
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
          <DiacriticsToolbar editor={termEditor} />
        </div>
      </div>
      {/* Definition pane */}
      <div
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
          <DiacriticsToolbar editor={defEditor} />
        </div>
      </div>
    </div>
  );
}

/* ─── Static content grid (no TipTap, just HTML previews) ─── */

function StaticContent({
  card,
  termErrors,
  defErrors,
  openImageModal,
  showAiBadge,
  aiSuggestion,
  defEmpty,
}: {
  card: Card;
  termErrors: ValidationError[];
  defErrors: ValidationError[];
  openImageModal: (target: 'term' | 'definition') => void;
  showAiBadge: boolean;
  aiSuggestion: string;
  defEmpty: boolean;
}) {
  return (
    <div className="flex-1 grid grid-cols-[1fr_1fr] gap-2 min-w-0">
      {/* Term pane */}
      <div
        className={`min-h-[44px] px-3 py-2 rounded-l-md ${termErrors.length > 0 ? 'bg-[var(--color-danger)]/5' : ''}`}
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
        <StaticPane html={card.term} placeholder={TERM_PLACEHOLDER} hasErrors={termErrors.length > 0} />
      </div>
      {/* Definition pane */}
      <div
        className={`relative min-h-[44px] px-3 py-2 rounded-r-md ${defErrors.length > 0 ? 'bg-[var(--color-danger)]/5' : ''}`}
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
        <StaticPane html={card.definition} placeholder={DEF_PLACEHOLDER} hasErrors={defErrors.length > 0} />
      </div>
    </div>
  );
}

/* ─── Main EditableCard ─── */

export const EditableCard = memo(function EditableCard({
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
  const [isEditing, setIsEditing] = useState(false);
  const [imageTarget, setImageTarget] = useState<'term' | 'definition' | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiBadge, setShowAiBadge] = useState(false);
  const cardRef = useRef<HTMLLIElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiBadgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const termEditorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const defEditorRef = useRef<ReturnType<typeof useEditor> | null>(null);

  const shouldAutoFocus = focusedCardIndex === cardIndex;

  // Activate editing when focusedCardIndex matches
  useEffect(() => {
    if (shouldAutoFocus) {
      setIsEditing(true);
    }
  }, [shouldAutoFocus]);

  // Handle blur: unmount editors after delay if focus leaves the card entirely
  const handleCardBlur = useCallback(() => {
    // Clear any previous blur timeout to avoid orphaned timers
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      if (cardRef.current && !cardRef.current.contains(document.activeElement)) {
        setIsEditing(false);
      }
    }, 300);
  }, []);

  const handleCardFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsEditing(true);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (aiBadgeTimeoutRef.current) clearTimeout(aiBadgeTimeoutRef.current);
    };
  }, []);

  const openImageModal = useCallback((target: 'term' | 'definition') => {
    setImageTarget(target);
  }, []);

  const hasErrors = validationErrors.length > 0;
  const hardErrors = validationErrors.filter(e => e.severity === 'hard');
  const termErrors = hardErrors.filter(e => !e.field || e.field === 'term' || e.code === 'EMPTY_TERM_CONTENT');
  const defErrors = hardErrors.filter(e => e.field === 'definition' || e.code === 'EMPTY_DEFINITION_CONTENT');

  const termPlain = useMemo(() => stripHtml(card.term).trim(), [card.term]);
  const defPlain = useMemo(() => stripHtml(card.definition).trim(), [card.definition]);
  const defEmpty = defPlain.length === 0;

  const fetchSuggestion = useDebouncedCallback(async () => {
    if (!canSuggest || !termPlain || !defEmpty) return;
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const ai = await getAIGenerator();
      const result = await ai.generateDefinition(termPlain, pattern.subjectDomain);
      if (result && defPlain === '') {
        setAiSuggestion(result);
        setShowAiBadge(true);
        if (aiBadgeTimeoutRef.current) clearTimeout(aiBadgeTimeoutRef.current);
        aiBadgeTimeoutRef.current = setTimeout(() => setShowAiBadge(false), 2000);
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

  // Callback to receive editor refs from ActiveEditors child
  const editorRefsCallback = useCallback((term: ReturnType<typeof useEditor> | null, def: ReturnType<typeof useEditor> | null) => {
    termEditorRef.current = term;
    defEditorRef.current = def;
  }, []);

  const handleImageSelect = useCallback((base64: string) => {
    const targetEditor = imageTarget === 'term' ? termEditorRef.current : defEditorRef.current;
    if (targetEditor) {
      targetEditor.chain().focus().insertContent(`<img src="${base64}" alt="" />`).run();
    } else {
      // Fallback: update card data directly if editors aren't mounted
      if (imageTarget === 'term') {
        onUpdate({ term: (card.term || '<p></p>').replace(/<\/p>$/, `<img src="${base64}" alt="" /></p>`) });
      } else {
        onUpdate({ definition: (card.definition || '<p></p>').replace(/<\/p>$/, `<img src="${base64}" alt="" /></p>`) });
      }
    }
    setImageTarget(null);
  }, [imageTarget, card.term, card.definition, onUpdate]);

  return (
    <li
      ref={cardRef}
      onFocusCapture={handleCardFocus}
      onBlurCapture={handleCardBlur}
      className={`group/card relative rounded-[var(--radius-card)] border ${hasErrors ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'} bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:border-[var(--color-text-secondary)]/25 focus-within:border-[var(--color-border-focus)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]/20 transition-colors duration-[var(--duration-fast)]`}
    >
      <div className="flex items-stretch min-h-[52px]">
        {/* Drag handle + card number */}
        <div
          className="flex items-center gap-1 pl-2 pr-2 cursor-grab active:cursor-grabbing text-[var(--color-text-secondary)]"
          {...(dragHandleProps ?? {})}
          aria-hidden
        >
          <span className="text-sm font-semibold tabular-nums text-[var(--color-primary)] select-none min-w-[1.25rem] text-center">{cardIndex + 1}</span>
          <GripVertical className="w-4 h-4 opacity-40 group-hover/card:opacity-100 transition-opacity" />
        </div>

        {/* Card content: either active editors or static previews */}
        {isEditing ? (
          <ActiveEditors
            card={card}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onEnterInDefinition={onEnterInDefinition}
            onFocusNextCard={onFocusNextCard}
            autoFocusTerm={shouldAutoFocus}
            aiSuggestion={aiSuggestion}
            setAiSuggestion={setAiSuggestion}
            termErrors={termErrors}
            defErrors={defErrors}
            editorRefsCallback={editorRefsCallback}
            openImageModal={openImageModal}
            showAiBadge={showAiBadge}
            defEmpty={defEmpty}
          />
        ) : (
          <StaticContent
            card={card}
            termErrors={termErrors}
            defErrors={defErrors}
            openImageModal={openImageModal}
            showAiBadge={showAiBadge}
            aiSuggestion={aiSuggestion}
            defEmpty={defEmpty}
          />
        )}

        {/* Action buttons */}
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

      {/* Validation errors */}
      {hardErrors.length > 0 && (
        <div className="px-3 py-2 bg-[var(--color-danger)]/5 border-t border-[var(--color-danger)]/20">
          {hardErrors.map((error, idx) => (
            <span key={idx} className="text-xs text-[var(--color-danger)] block">
              {error.message}
            </span>
          ))}
        </div>
      )}

      {/* Image search modal - imageTarget !== null means open */}
      <ImageSearchModal
        open={imageTarget !== null}
        onClose={() => setImageTarget(null)}
        onSelect={handleImageSelect}
        initialQuery={sanitizeSearchQuery(card.term || '')}
      />
    </li>
  );
});
