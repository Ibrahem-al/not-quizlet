import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, Check, Search } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getTextContent } from '../lib/contentHelpers';
import { hasContent, hasTermContent, hasDefinitionContent } from '../lib/validation';
import type { Card } from '../types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };
const MIN_SELECTED = 2;

interface CardFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  selectedIds: Set<string> | null;
  onApply: (ids: Set<string>) => void;
}

export function CardFilterModal({ isOpen, onClose, cards, selectedIds, onApply }: CardFilterModalProps) {
  // Only show valid cards (same filter as StudyPage)
  const validCards = useMemo(
    () => cards.filter((c) => hasContent(c) && hasTermContent(c) && hasDefinitionContent(c)),
    [cards]
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(selectedIds ? new Set(selectedIds) : new Set(validCards.map((c) => c.id)));
      setSearch('');
    }
  }, [isOpen, selectedIds, validCards]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Focus restore
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    return () => { prev?.focus(); };
  }, [isOpen]);

  const filteredCards = useMemo(() => {
    if (!search.trim()) return validCards;
    const q = search.toLowerCase();
    return validCards.filter((c) => {
      const term = getTextContent(c.term).toLowerCase();
      const def = getTextContent(c.definition).toLowerCase();
      return term.includes(q) || def.includes(q);
    });
  }, [validCards, search]);

  const toggleCard = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= MIN_SELECTED) return prev; // enforce minimum
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(validCards.map((c) => c.id)));
  const deselectAll = () => {
    // Select only the first MIN_SELECTED valid cards
    setSelected(new Set(validCards.slice(0, MIN_SELECTED).map((c) => c.id)));
  };

  const allSelected = selected.size === validCards.length;

  const handleApply = () => {
    onApply(selected);
    onClose();
  };

  /** Truncate text for display */
  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-filter-title"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />

          {/* Modal */}
          <motion.div
            className="relative bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] w-full max-w-lg max-h-[80vh] flex flex-col"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-0">
              <div>
                <h2 id="card-filter-title" className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Filter className="w-5 h-5 text-[var(--color-primary)]" />
                  Filter Cards
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                  {selected.size} of {validCards.length} cards selected
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search + bulk actions */}
            <div className="px-5 pt-4 space-y-3">
              <Input
                placeholder="Search cards..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  disabled={allSelected}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-40"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  disabled={selected.size <= MIN_SELECTED}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-40"
                >
                  Deselect All
                </button>
                {selected.size < MIN_SELECTED && (
                  <span className="text-xs text-[var(--color-warning)] self-center">
                    At least {MIN_SELECTED} cards required
                  </span>
                )}
              </div>
            </div>

            {/* Card list */}
            <div className="p-5 pt-3 overflow-y-auto flex-1">
              <ul className="space-y-1.5">
                {filteredCards.map((card) => {
                  const isSelected = selected.has(card.id);
                  const termText = getTextContent(card.term);
                  const defText = getTextContent(card.definition);
                  const wouldGoBelow = isSelected && selected.size <= MIN_SELECTED;

                  return (
                    <li key={card.id}>
                      <button
                        type="button"
                        onClick={() => toggleCard(card.id)}
                        disabled={wouldGoBelow}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border transition-all text-left ${
                          isSelected
                            ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary-muted)]/15'
                            : 'border-[var(--color-border)] bg-[var(--color-background)] opacity-60'
                        } ${wouldGoBelow ? 'cursor-not-allowed' : 'hover:border-[var(--color-primary)]/60 cursor-pointer'}`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'border-2 border-[var(--color-border)]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>

                        {/* Card content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs text-[var(--color-text-tertiary)] shrink-0">
                              {cards.indexOf(card) + 1}.
                            </span>
                            <span className="text-sm font-medium text-[var(--color-text)] truncate">
                              {truncate(termText || '(image)', 50)}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5 ml-5">
                            {truncate(defText || '(image)', 60)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {filteredCards.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="w-6 h-6 text-[var(--color-text-tertiary)] mb-2" />
                  <p className="text-sm text-[var(--color-text-secondary)]">No cards match your search.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {allSelected ? 'All cards included' : `${validCards.length - selected.size} card${validCards.length - selected.size === 1 ? '' : 's'} excluded`}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleApply}>
                  Apply Filter
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
