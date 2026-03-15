/**
 * Vertical stream of sortable cards with keyboard nav, pagination, and ghost "add card" button.
 */

import { memo, useCallback, useEffect, useState } from 'react';
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
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { getDuplicateTermCardIds, hasContent } from '../../lib/validation';
import { CardEditor } from './CardEditor';
import type { Card } from '../../types';

const CARDS_PER_PAGE = 20;

const SortableCard = memo(function SortableCard({
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
    <div
      ref={setNodeRef}
      style={style}
      id={`card-${card.id}`}
      className={isDragging ? 'opacity-90 z-50 rotate-1 scale-[1.02]' : ''}
      data-card-index={index}
      data-duplicate-term={isDuplicateTerm || undefined}
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
    </div>
  );
});

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

  // Pagination state
  const totalPages = Math.max(1, Math.ceil(cards.length / CARDS_PER_PAGE));
  const [page, setPage] = useState(0);
  // Clamp page if cards are deleted
  const clampedPage = Math.min(page, totalPages - 1);
  if (clampedPage !== page) setPage(clampedPage);

  const pageStart = clampedPage * CARDS_PER_PAGE;
  const pageEnd = Math.min(pageStart + CARDS_PER_PAGE, cards.length);
  const pageCards = cards.slice(pageStart, pageEnd);

  // Navigate to the page containing a card index
  const navigateToCard = useCallback((cardIndex: number) => {
    const targetPage = Math.floor(cardIndex / CARDS_PER_PAGE);
    setPage(targetPage);
  }, []);

  // Keep active card's page in sync
  useEffect(() => {
    if (activeCardIndex >= 0 && activeCardIndex < cards.length) {
      const targetPage = Math.floor(activeCardIndex / CARDS_PER_PAGE);
      if (targetPage !== clampedPage) {
        setPage(targetPage);
      }
    }
  }, [activeCardIndex, cards.length, clampedPage]);

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
        const lastCard = cards[cards.length - 1];
        if (lastCard && !hasContent(lastCard)) {
          onActiveCardChange(cards.length - 1);
          navigateToCard(cards.length - 1);
        } else {
          addCard(activeCardIndex + 1);
          onActiveCardChange(activeCardIndex + 1);
          navigateToCard(activeCardIndex + 1);
        }
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
        // Map active index to page-relative index for DOM queries
        const pageRelIndex = activeCardIndex - pageStart;
        if (target.closest('[data-term-pane]') && defPanes?.[pageRelIndex]) {
          e.preventDefault();
          (defPanes[pageRelIndex] as HTMLElement).querySelector<HTMLElement>('.ProseMirror')?.focus();
        } else if (target.closest('[data-def-pane]')) {
          if (activeCardIndex < cards.length - 1) {
            e.preventDefault();
            const nextIndex = activeCardIndex + 1;
            onActiveCardChange(nextIndex);
            navigateToCard(nextIndex);
            // Focus will happen after page change via CardEditor's isActive
          } else {
            const lastCard = cards[cards.length - 1];
            if (lastCard && !hasContent(lastCard)) {
              e.preventDefault();
              onActiveCardChange(cards.length - 1);
            } else {
              e.preventDefault();
              addCard();
              const newIndex = cards.length;
              onActiveCardChange(newIndex);
              navigateToCard(newIndex);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCardIndex, cards.length, addCard, deleteCard, onActiveCardChange, editorRef, pageStart, navigateToCard]);

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
      <SortableContext items={pageCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {/* Page navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pb-4">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={clampedPage === 0}
              className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-[var(--color-text-secondary)] tabular-nums select-none">
              Cards {pageStart + 1}–{pageEnd} of {cards.length}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={clampedPage >= totalPages - 1}
              className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <div ref={editorRef} className="studio-stream space-y-8 pb-8">
          {pageCards.map((card, pageIndex) => {
            const globalIndex = pageStart + pageIndex;
            return (
              <SortableCard
                key={card.id}
                card={card}
                index={globalIndex}
                isActive={activeCardIndex === globalIndex}
                isDuplicateTerm={duplicateTermIds.has(card.id)}
                onFocus={() => onActiveCardChange(globalIndex)}
                onBlur={() => {}}
                triggerImageModal={triggerImageModal}
                onImageModalTriggered={onImageModalTriggered}
              />
            );
          })}
          <button
            type="button"
            onClick={() => {
              const lastCard = cards[cards.length - 1];
              if (lastCard && !hasContent(lastCard)) {
                onActiveCardChange(cards.length - 1);
                navigateToCard(cards.length - 1);
              } else {
                addCard();
                const newIndex = cards.length;
                onActiveCardChange(newIndex);
                navigateToCard(newIndex);
              }
            }}
            className="studio-add-card-btn w-full rounded-xl py-8 flex items-center justify-center gap-2 transition-colors font-medium hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-5 h-5" />
            Add card (Ctrl+Enter)
          </button>
        </div>
      </SortableContext>
    </DndContext>
  );
}
