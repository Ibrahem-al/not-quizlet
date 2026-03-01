/**
 * Vertical stream of sortable cards with keyboard nav and ghost "add card" button.
 */

import { useCallback, useEffect } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { getDuplicateTermCardIds } from '../../lib/validation';
import { CardEditor } from './CardEditor';
import type { Card } from '../../types';

function SortableCard({
  card,
  index,
  isActive,
  isDuplicateTerm,
  onFocus,
  onBlur,
  triggerImageModal,
  onImageModalTriggered,
}: {
  card: Card;
  index: number;
  isActive: boolean;
  isDuplicateTerm: boolean;
  onFocus: () => void;
  onBlur: () => void;
  triggerImageModal: number | null;
  onImageModalTriggered: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} id={`card-${card.id}`} className={isDragging ? 'opacity-90 z-50' : ''} data-card-index={index} data-duplicate-term={isDuplicateTerm || undefined}>
      <motion.div
        animate={isDragging ? { rotate: 2, scale: 1.02 } : { rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <CardEditor
          card={card}
          index={index}
          isActive={isActive}
          onFocus={onFocus}
          onBlur={onBlur}
          dragHandleProps={{ ...attributes, ...listeners }}
          triggerImageModal={triggerImageModal}
          onImageModalTriggered={onImageModalTriggered}
        />
      </motion.div>
    </div>
  );
}

interface EditorStreamProps {
  activeCardIndex: number;
  onActiveCardChange: (index: number) => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
  triggerImageModal: number | null;
  onImageModalTriggered: () => void;
  onRequestImageModal?: (cardIndex: number) => void;
}

export function EditorStream({
  activeCardIndex,
  onActiveCardChange,
  editorRef,
  triggerImageModal,
  onImageModalTriggered,
  onRequestImageModal,
}: EditorStreamProps) {
  const { set, addCard, deleteCard, reorderCards } = useEditorStore();
  const cards = set?.cards ?? [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = cards.findIndex((c) => c.id === active.id);
      const newIndex = cards.findIndex((c) => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) reorderCards(oldIndex, newIndex);
    },
    [cards, reorderCards]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!editorRef.current?.contains(document.activeElement)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        addCard(activeCardIndex + 1);
        onActiveCardChange(activeCardIndex + 1);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
        e.preventDefault();
        const card = cards[activeCardIndex];
        if (card) {
          deleteCard(card.id);
          onActiveCardChange(Math.max(0, activeCardIndex - 1));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        onRequestImageModal?.(activeCardIndex);
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        const defPanes = editorRef.current?.querySelectorAll('[data-def-pane]');
        const termPanes = editorRef.current?.querySelectorAll('[data-term-pane]');
        if (target.closest('[data-term-pane]') && defPanes?.[activeCardIndex]) {
          e.preventDefault();
          (defPanes[activeCardIndex] as HTMLElement).querySelector<HTMLElement>('.ProseMirror')?.focus();
        } else if (target.closest('[data-def-pane]')) {
          if (activeCardIndex < cards.length - 1) {
            e.preventDefault();
            const nextTerm = termPanes?.[activeCardIndex + 1] as HTMLElement | undefined;
            nextTerm?.querySelector<HTMLElement>('.ProseMirror')?.focus();
            onActiveCardChange(activeCardIndex + 1);
          } else {
            e.preventDefault();
            addCard();
            onActiveCardChange(cards.length);
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCardIndex, cards.length, addCard, deleteCard, onActiveCardChange, editorRef]);

  if (!set) return null;

  const duplicateTermIds = getDuplicateTermCardIds(set);

  if (cards.length === 0) {
    return (
      <div className="studio-stream flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl border border-[var(--color-text-secondary)]/20 bg-[var(--color-surface)] px-8 py-10 shadow-sm max-w-md">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/15 flex items-center justify-center mb-4 mx-auto">
            <Sparkles className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">Create your first card</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Click below or press Ctrl+Enter to add a card. Use Tab to move between term and definition.
          </p>
          <button
            type="button"
            onClick={() => {
              addCard();
              onActiveCardChange(0);
            }}
            className="px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition shadow-sm"
          >
            <Plus className="w-4 h-4 inline-block mr-2 align-middle" />
            Add card
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={editorRef} className="studio-stream space-y-8 pb-8">
          {cards.map((card, index) => (
            <SortableCard
              key={card.id}
              card={card}
              index={index}
              isActive={activeCardIndex === index}
              isDuplicateTerm={duplicateTermIds.has(card.id)}
              onFocus={() => onActiveCardChange(index)}
              onBlur={() => {}}
              triggerImageModal={triggerImageModal}
              onImageModalTriggered={onImageModalTriggered}
            />
          ))}
          <motion.button
            type="button"
            onClick={() => {
              addCard();
              onActiveCardChange(cards.length);
              setTimeout(() => {
                const lastCard = editorRef.current?.querySelector(`[data-card-index="${cards.length}"]`);
                lastCard?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="studio-add-card-btn w-full rounded-xl py-8 flex items-center justify-center gap-2 transition-colors font-medium"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="w-5 h-5" />
            Add card (Ctrl+Enter)
          </motion.button>
        </div>
      </SortableContext>
    </DndContext>
  );
}
