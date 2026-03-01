/**
 * Studio Mode: single bilateral card (term | definition) with resizable sash and TipTap.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { motion } from 'framer-motion';
import { GripVertical, ImagePlus } from 'lucide-react';
import { getEditorExtensions } from '../../lib/editorExtensions';
import { sanitizeSearchQuery } from '../../lib/imageSearch';
import { stripHtml, MAX_TERM_LENGTH, MAX_DEFINITION_LENGTH } from '../../lib/validation';
import { useEditorStore } from '../../stores/editorStore';
import { useValidationStore } from '../../stores/validationStore';
import type { Card } from '../../types';
import { FloatingToolbar } from './FloatingToolbar';
import { MediaDropzone } from './MediaDropzone';
import { ImageSearchModal } from './ImageSearchModal';
import '../../styles/editor.css';

const TERM_PLACEHOLDER = 'Enter term...';
const DEF_PLACEHOLDER = 'Enter definition...';

const defaultLayout = (): number[] => {
  try {
    const s = localStorage.getItem('studio-sash-layout');
    if (s) {
      const [a, b] = JSON.parse(s);
      if (typeof a === 'number' && typeof b === 'number' && a + b === 100) return [a, b];
    }
  } catch {
    /* ignore */
  }
  return [40, 60];
};

type Pane = 'term' | 'def';

interface CardEditorProps {
  card: Card;
  index: number;
  isActive: boolean;
  isDuplicateTerm?: boolean;
  onFocus: () => void;
  onBlur: () => void;
  dragHandleProps?: Record<string, unknown>;
  /** When set to this card's index, open image search modal for last-focused pane. */
  triggerImageModal?: number | null;
  onImageModalTriggered?: () => void;
}

export function CardEditor({ card, index, isActive, isDuplicateTerm, onFocus, onBlur, dragHandleProps, triggerImageModal, onImageModalTriggered }: CardEditorProps) {
  const updateCard = useEditorStore((s) => s.updateCard);
  const unsavedChanges = useEditorStore((s) => s.unsavedChanges);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState(defaultLayout());
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalPane, setImageModalPane] = useState<Pane>('term');
  const [lastFocusedPane, setLastFocusedPane] = useState<Pane>('term');
  const [shakeTerm, setShakeTerm] = useState(false);
  const termEmpty = !card.term || card.term.replace(/<[^>]*>/g, '').trim() === '';
  const cardErrors = useValidationStore((s) => s.cardErrors.get(card.id) ?? []);
  const hasHardError = cardErrors.some((e) => e.severity === 'hard');
  const emptyTermError = cardErrors.find((e) => e.code === 'EMPTY_TERM');
  const termLen = stripHtml(card.term).length;
  const defLen = stripHtml(card.definition).length;
  const termOverLimit = termLen > MAX_TERM_LENGTH;
  const defOverLimit = defLen > MAX_DEFINITION_LENGTH;

  useEffect(() => {
    if (triggerImageModal === index) {
      setImageModalPane(lastFocusedPane);
      setImageModalOpen(true);
      onImageModalTriggered?.();
    }
  }, [triggerImageModal, index, lastFocusedPane, onImageModalTriggered]);

  const syncTerm = useCallback(
    (html: string) => {
      updateCard(card.id, { term: html });
    },
    [card.id, updateCard]
  );

  const syncDef = useCallback(
    (html: string) => {
      updateCard(card.id, { definition: html });
    },
    [card.id, updateCard]
  );

  const termEditor = useEditor({
    extensions: getEditorExtensions(TERM_PLACEHOLDER),
    content: card.term || '<p></p>',
    editorProps: {
      attributes: { class: 'studio-editor' },
      handleDOMEvents: {
        focus: () => onFocus(),
        blur: () => onBlur(),
      },
    },
    onUpdate: ({ editor }) => syncTerm(editor.getHTML()),
    immediatelyRender: false,
  }, [card.id]);

  const defEditor = useEditor({
    extensions: getEditorExtensions(DEF_PLACEHOLDER),
    content: card.definition || '<p></p>',
    editorProps: {
      attributes: { class: 'studio-editor' },
      handleDOMEvents: {
        focus: () => { setLastFocusedPane('def'); onFocus(); },
        blur: () => onBlur(),
      },
    },
    onUpdate: ({ editor }) => syncDef(editor.getHTML()),
    immediatelyRender: false,
  }, [card.id]);

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

  const status = hasHardError ? 'error' : termEmpty ? 'error' : unsavedChanges ? 'unsaved' : 'saved';

  useEffect(() => {
    if (emptyTermError && termEditor) {
      const onBlur = () => setShakeTerm(true);
      const el = termEditor.view.dom;
      el.addEventListener('blur', onBlur);
      return () => el.removeEventListener('blur', onBlur);
    }
  }, [emptyTermError, termEditor]);
  useEffect(() => {
    if (!shakeTerm) return;
    const t = setTimeout(() => setShakeTerm(false), 400);
    return () => clearTimeout(t);
  }, [shakeTerm]);

  const handleLayoutChanged = useCallback((layoutMap: { term?: number; def?: number }) => {
    const t = layoutMap.term ?? 40;
    const d = layoutMap.def ?? 60;
    setLayout([t, d]);
    try {
      localStorage.setItem('studio-sash-layout', JSON.stringify([t, d]));
    } catch {
      /* ignore */
    }
  }, []);

  const defaultLayoutMap = { term: layout[0], def: layout[1] };

  return (
    <motion.div
      ref={containerRef}
      layout
      className={`studio-card relative rounded-xl overflow-hidden ${isDuplicateTerm ? 'studio-card-duplicate' : ''}`}
      data-status={status}
      data-duplicate-term={isDuplicateTerm ? 'true' : undefined}
      initial={false}
      animate={{
        scale: isActive ? 1.005 : 1,
        boxShadow: isActive ? '0 0 0 2px var(--color-primary)' : 'var(--shadow-card)',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onFocus={onFocus}
    >
      <div className="studio-card-badge absolute -top-3 -left-3 z-10 flex items-center gap-1 rounded-full text-xs font-mono px-2 py-1" {...dragHandleProps}>
        <GripVertical className="w-3.5 h-3.5" aria-hidden />
        {index + 1}
      </div>

      <Group orientation="horizontal" defaultLayout={defaultLayoutMap} onLayoutChanged={handleLayoutChanged} className="min-h-[140px]">
        <Panel id="term" defaultSize={layout[0]} minSize={20} maxSize={70} data-term-pane className={`flex flex-col min-h-0 ${shakeTerm ? 'studio-card-shake' : ''}`}>
          <div className="studio-pane-label flex-shrink-0" data-pane="term">Term</div>
          {emptyTermError && (
            <p className="flex-shrink-0 px-3 py-1 text-xs text-[var(--color-danger)]" role="status">
              {emptyTermError.message}
            </p>
          )}
          <div className="flex-shrink-0 flex items-center justify-end px-2">
            <span className={`text-[10px] tabular-nums ${termOverLimit ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
              {termLen} / {MAX_TERM_LENGTH}
            </span>
          </div>
          <MediaDropzone
            onImage={(base64) => {
              termEditor?.chain().focus().setImage({ src: base64 }).run();
            }}
            className="flex-1 min-h-0 min-h-[100px]"
          >
            <div className="flex items-center justify-end gap-1 px-2 pt-1">
              <button
                type="button"
                onClick={() => { setImageModalPane('term'); setImageModalOpen(true); }}
                className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-text-secondary)]/10 hover:text-[var(--color-text)]"
                title="Search or upload image (Ctrl+Shift+I)"
                aria-label="Add image"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            </div>
            <FloatingToolbar editor={termEditor} />
            <EditorContent editor={termEditor} />
          </MediaDropzone>
        </Panel>
        <Separator className="studio-sash" />
        <Panel id="def" defaultSize={layout[1]} minSize={30} maxSize={80} data-def-pane className="flex flex-col min-h-0">
          <div className="studio-pane-label flex-shrink-0 flex items-center justify-between">
            <span>Definition</span>
            <span className={`text-[10px] tabular-nums ${defOverLimit ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
              {defLen} / {MAX_DEFINITION_LENGTH}
            </span>
          </div>
          <MediaDropzone
            onImage={(base64) => {
              defEditor?.chain().focus().setImage({ src: base64 }).run();
            }}
            className="flex-1 min-h-0 min-h-[100px]"
          >
            <div className="flex items-center justify-end gap-1 px-2 pt-1">
              <button
                type="button"
                onClick={() => { setImageModalPane('def'); setImageModalOpen(true); }}
                className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-text-secondary)]/10 hover:text-[var(--color-text)]"
                title="Search or upload image (Ctrl+Shift+I)"
                aria-label="Add image"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            </div>
            <FloatingToolbar editor={defEditor} />
            <EditorContent editor={defEditor} />
          </MediaDropzone>
        </Panel>
      </Group>

      <ImageSearchModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onSelect={(base64) => {
          if (imageModalPane === 'term') termEditor?.chain().focus().setImage({ src: base64 }).run();
          else defEditor?.chain().focus().setImage({ src: base64 }).run();
          setImageModalOpen(false);
        }}
        initialQuery={
          imageModalPane === 'term'
            ? sanitizeSearchQuery(card.term) || sanitizeSearchQuery(card.definition).slice(0, 50)
            : sanitizeSearchQuery(card.definition) || sanitizeSearchQuery(card.term).slice(0, 50)
        }
      />
    </motion.div>
  );
}
