import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X } from 'lucide-react';
import { Flashcard } from '../study/Flashcard';
import { Button } from '../ui';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useSpacedRep } from '../../hooks/useSpacedRep';
import type { Card } from '../../types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface FlashcardModeProps {
  cards: Card[];
  setId: string;
  onExit: () => void;
}

export function FlashcardMode({ cards, setId, onExit }: FlashcardModeProps) {
  const [index, setIndex] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { recordReview } = useSpacedRep(setId);

  const currentCard = cards[index];
  const progress = cards.length ? `${index + 1} / ${cards.length}` : '0 / 0';

  const handleRate = useCallback(
    async (quality: number) => {
      if (!currentCard) return;
      const start = Date.now();
      await recordReview(currentCard, quality, Date.now() - start, 'flashcards');
      if (index < cards.length - 1) setIndex((i) => i + 1);
      else onExit();
    },
    [currentCard, index, cards.length, recordReview, onExit]
  );

  const handleSkip = useCallback(() => {
    if (index < cards.length - 1) setIndex((i) => i + 1);
    else onExit();
  }, [index, cards.length, onExit]);

  const handlePrev = useCallback(() => {
    if (index > 0) setIndex((i) => i - 1);
  }, [index]);

  const handleNext = useCallback(() => {
    if (index < cards.length - 1) setIndex((i) => i + 1);
    else onExit();
  }, [index, cards.length, onExit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showExitConfirm) setShowExitConfirm(false);
        else setShowExitConfirm(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showExitConfirm]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-[var(--color-text-secondary)]">No cards in this set.</p>
        <p className="text-sm text-[var(--color-text-secondary)]">Add cards to this set first.</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 border-b border-[var(--color-text-secondary)]/20 bg-[var(--color-surface)]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-[var(--color-text-secondary)]">
            {progress}
          </span>
          <Button variant="ghost" onClick={() => setShowExitConfirm(true)} aria-label="Exit">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handlePrev}
            disabled={index === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          <Button
            variant="secondary"
            onClick={handleNext}
          >
            Next
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard?.id ?? 'empty'}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={spring}
            className="w-full"
          >
            {currentCard && (
              <Flashcard
                card={currentCard}
                onRate={handleRate}
                onSkip={handleSkip}
                onPrev={handlePrev}
                onNext={handleNext}
                isActive
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="p-4 border-t border-[var(--color-text-secondary)]/20 bg-[var(--color-surface)] flex justify-center gap-3">
        <Button
          variant="secondary"
          onClick={() => handleRate(2)}
          className="bg-[var(--color-warning)]/20"
        >
          Study again
        </Button>
        <Button variant="secondary" onClick={handleSkip}>
          Skip
        </Button>
        <Button onClick={() => handleRate(5)}>
          Know it
        </Button>
      </footer>

      <ConfirmModal
        open={showExitConfirm}
        title="Exit study session?"
        confirmLabel="Exit"
        cancelLabel="Cancel"
        danger
        onConfirm={onExit}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}
