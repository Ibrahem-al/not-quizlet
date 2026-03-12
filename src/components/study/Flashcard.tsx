import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { Card } from '../../types';

const flipSpring = { type: 'spring' as const, stiffness: 280, damping: 26 };
const defaultSpring = { type: 'spring' as const, stiffness: 300, damping: 30 };

/** Extract plain text from HTML string */
function getPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

interface FlashcardProps {
  card: Card;
  onRate?: (quality: number) => void;
  onSkip?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isActive?: boolean;
}

export function Flashcard({
  card,
  onRate,
  onSkip,
  onPrev,
  onNext,
  isActive = true,
}: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [wordsRevealed, setWordsRevealed] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'down' | null>(null);

  // Use plain text for progressive word reveal (HTML tags break word splitting)
  const plainTextDef = useMemo(() => getPlainText(card.definition), [card.definition]);
  const plainTextWords = useMemo(() => plainTextDef.split(/\s+/).filter(Boolean), [plainTextDef]);

  // Progressive reveal uses plain text words; full view shows HTML
  const showFullDefinition = flipped && wordsRevealed === 0;
  const visiblePlainText = wordsRevealed > 0
    ? plainTextWords.slice(0, wordsRevealed).join(' ')
    : '';

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -50, 0, 50, 200], [0.5, 1, 1, 1, 0.5]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const vx = info.velocity.x;
      const vy = info.velocity.y;
      const threshold = 100;
      if (Math.abs(vx) > threshold) {
        if (vx > 0) {
          setExitDirection('right');
          onRate?.(5); // Know it
        } else {
          setExitDirection('left');
          onRate?.(2); // Study again
        }
        return;
      }
      if (vy > threshold) {
        setExitDirection('down');
        onSkip?.();
        return;
      }
      animate(x, 0, defaultSpring);
      animate(y, 0, defaultSpring);
    },
    [onRate, onSkip, x, y]
  );

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (wordsRevealed < plainTextWords.length && flipped) {
          setWordsRevealed((w) => Math.min(w + 1, plainTextWords.length));
        } else {
          setFlipped((f) => !f);
          if (!flipped) setWordsRevealed(0);
        }
      } else if (e.key === 'ArrowLeft') onPrev?.();
      else if (e.key === 'ArrowRight') onNext?.();
      else if (e.key === '1') onRate?.(3);
      else if (e.key === '2') onRate?.(4);
      else if (e.key === '3') onRate?.(5);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, flipped, wordsRevealed, plainTextWords.length, onPrev, onNext, onRate]);

  const handleFlip = () => {
    if (wordsRevealed < plainTextWords.length && flipped) {
      setWordsRevealed((w) => Math.min(w + 1, plainTextWords.length));
    } else {
      setFlipped((f) => !f);
      if (!flipped) setWordsRevealed(0);
    }
  };

  if (exitDirection) {
    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={false}
        animate={{
          x: exitDirection === 'left' ? -400 : exitDirection === 'right' ? 400 : 0,
          y: exitDirection === 'down' ? 400 : 0,
          opacity: 0,
        }}
        transition={defaultSpring}
      />
    );
  }

  return (
    <motion.div
      className="relative w-full max-w-lg mx-auto cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate, opacity }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="relative w-full min-h-[280px] rounded-[var(--radius-card)] overflow-hidden"
        style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
        onClick={handleFlip}
      >
        <motion.div
          className="relative w-full min-h-[280px] rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={flipSpring}
        >
          {/* Front: term */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-[var(--radius-card)] bg-[var(--color-surface)] overflow-y-auto"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div
              className="text-lg text-[var(--color-text)] study-content"
              dangerouslySetInnerHTML={{ __html: card.term }}
            />
            <span className="mt-2 text-sm text-[var(--color-text-secondary)] shrink-0">
              Tap or press Space to flip
            </span>
          </div>
          {/* Back: definition */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-[var(--radius-card)] bg-[var(--color-surface)] overflow-y-auto"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {showFullDefinition ? (
              <div
                className="text-lg text-[var(--color-text)] study-content"
                dangerouslySetInnerHTML={{ __html: card.definition }}
              />
            ) : (
              <p className="text-lg text-[var(--color-text)] whitespace-pre-wrap">
                {visiblePlainText}
              </p>
            )}
            {wordsRevealed > 0 && wordsRevealed < plainTextWords.length && (
              <span className="mt-2 text-sm text-[var(--color-text-secondary)] shrink-0">
                Space: reveal next word
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
