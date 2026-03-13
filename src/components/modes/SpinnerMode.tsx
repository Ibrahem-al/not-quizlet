import type { ReactElement } from 'react';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '../ui';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { Card } from '../../types';

/** Extract plain text from HTML string */
function getPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

/** Check if content is only images with no text */
function isImageOnly(content: string): boolean {
  if (!content) return false;
  const withoutImages = content.replace(/<img[^>]*>/gi, '');
  const textContent = withoutImages.replace(/<[^>]*>/g, '').trim();
  return textContent === '' && content.includes('<img');
}

/** Extract all image srcs from HTML content */
function extractAllImageSrcs(html: string): string[] {
  const srcs: string[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    srcs.push(match[1]);
  }
  return srcs;
}

interface SpinnerModeProps {
  cards: Card[];
  setId: string;
  onExit: () => void;
}

const SEGMENT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f97316', '#14b8a6', '#a855f7', '#3b82f6', '#84cc16',
];

/**
 * Determine how to display a card — same rules as TestMode written questions:
 * - If term is image-only → show image as prompt, user needs to know the word (definition)
 * - If definition is image-only → show image as prompt, user needs to know the word (term)
 * - If both have text → show term as prompt, definition as answer (normal)
 * - If both are image-only → card should have been filtered out already
 */
function getCardDisplay(card: Card): {
  prompt: string; promptLabel: string;
  answer: string; answerLabel: string;
  spinnerLabel: string;
  spinnerImageSrcs: string[];
} {
  const termIsImage = isImageOnly(card.term);
  const defIsImage = isImageOnly(card.definition);

  if (termIsImage && !defIsImage) {
    return {
      prompt: card.term, promptLabel: 'Image',
      answer: card.definition, answerLabel: 'Definition',
      spinnerLabel: '', spinnerImageSrcs: extractAllImageSrcs(card.term),
    };
  }
  if (defIsImage && !termIsImage) {
    return {
      prompt: card.definition, promptLabel: 'Image',
      answer: card.term, answerLabel: 'Term',
      spinnerLabel: '', spinnerImageSrcs: extractAllImageSrcs(card.definition),
    };
  }
  return {
    prompt: card.term, promptLabel: 'Term',
    answer: card.definition, answerLabel: 'Definition',
    spinnerLabel: getPlainText(card.term), spinnerImageSrcs: [],
  };
}

// Spin duration in ms
const SPIN_DURATION = 4000;

export function SpinnerMode({ cards, onExit }: SpinnerModeProps) {
  const validCards = useMemo(() =>
    cards.filter((c) => !(isImageOnly(c.term) && isImageOnly(c.definition))),
    [cards]
  );

  const [remainingCards, setRemainingCards] = useState<Card[]>(() => [...validCards]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [rotation, setRotation] = useState(0);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const winIndexRef = useRef(0);

  const totalCards = validCards.length;
  const isComplete = remainingCards.length === 0;
  const skippedCount = cards.length - validCards.length;

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCard) handleDismissCard();
        else if (showExitConfirm) setShowExitConfirm(false);
        else setShowExitConfirm(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCard, showExitConfirm]);

  const handleSpin = useCallback(() => {
    if (isSpinning || remainingCards.length === 0) return;

    setIsSpinning(true);
    setSelectedCard(null);
    setFlipped(false);

    const count = remainingCards.length;
    const winIndex = Math.floor(Math.random() * count);
    winIndexRef.current = winIndex;

    const segAngle = 360 / count;
    const targetAngle = winIndex * segAngle + segAngle / 2;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const newRotation = rotation + extraSpins * 360 + (360 - targetAngle) - (rotation % 360);

    // Just set the new rotation — Framer Motion's motion.g handles the animation
    setRotation(newRotation);

    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false);
      setSelectedCard(remainingCards[winIndex]);
    }, SPIN_DURATION + 200);
  }, [isSpinning, remainingCards, rotation]);

  const handleDismissCard = useCallback(() => {
    if (!selectedCard) return;
    setRemainingCards((prev) => prev.filter((c) => c.id !== selectedCard.id));
    setCompletedCount((c) => c + 1);
    setSelectedCard(null);
    setFlipped(false);
  }, [selectedCard]);

  const handleReset = useCallback(() => {
    setRemainingCards([...validCards]);
    setCompletedCount(0);
    setSelectedCard(null);
    setFlipped(false);
    setIsSpinning(false);
    setRotation(0);
  }, [validCards]);

  const wheelContent = useMemo(() => {
    const count = remainingCards.length;
    if (count === 0) return { segments: null, defs: null };

    const cx = 200;
    const cy = 200;
    const r = 190;
    const segments: ReactElement[] = [];
    const clipDefs: ReactElement[] = [];

    for (let i = 0; i < count; i++) {
      const startAngle = (i * 360) / count - 90;
      const endAngle = ((i + 1) * 360) / count - 90;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);

      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      const pathD = count === 1
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

      const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
      const textR = r * 0.62;
      const tx = cx + textR * Math.cos(midAngle);
      const ty = cy + textR * Math.sin(midAngle);
      const textRotation = (startAngle + endAngle) / 2 + 90;

      const display = getCardDisplay(remainingCards[i]);
      const images = display.spinnerImageSrcs;
      const hasImages = images.length > 0;
      const label = display.spinnerLabel;
      const displayTerm = label.length > 18 ? label.slice(0, 16) + '…' : label;
      const fontSize = count <= 6 ? 12 : count <= 12 ? 10 : 8;

      // For image thumbnails, determine size based on segment count and image count
      const baseThumbSize = count <= 4 ? 50 : count <= 8 ? 36 : 26;
      // Scale down if multiple images
      const thumbSize = images.length <= 1 ? baseThumbSize
        : images.length === 2 ? baseThumbSize * 0.7
        : baseThumbSize * 0.55;

      // Create clip paths and image elements for all images in this segment
      if (hasImages) {
        // Calculate positions for multiple images along the segment's radial axis
        const spacing = thumbSize * 1.15;
        // Perpendicular direction to the radial axis (for side-by-side layout)
        const perpAngle = midAngle + Math.PI / 2;

        images.forEach((_src, imgIdx) => {
          const clipId = `clip-img-${i}-${imgIdx}`;
          // Offset from center along perpendicular axis
          const offset = images.length === 1 ? 0 : (imgIdx - (images.length - 1) / 2) * spacing;
          const imgX = tx + offset * Math.cos(perpAngle);
          const imgY = ty + offset * Math.sin(perpAngle);

          clipDefs.push(
            <clipPath key={clipId} id={clipId}>
              <circle cx={imgX} cy={imgY} r={thumbSize / 2} />
            </clipPath>
          );
        });
      }

      segments.push(
        <g key={remainingCards[i].id}>
          <path d={pathD} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          {hasImages ? (
            <>
              {images.map((src, imgIdx) => {
                const clipId = `clip-img-${i}-${imgIdx}`;
                const spacing = thumbSize * 1.15;
                const perpAngle = midAngle + Math.PI / 2;
                const offset = images.length === 1 ? 0 : (imgIdx - (images.length - 1) / 2) * spacing;
                const imgX = tx + offset * Math.cos(perpAngle);
                const imgY = ty + offset * Math.sin(perpAngle);

                return (
                  <g key={imgIdx}>
                    <image
                      href={src}
                      x={imgX - thumbSize / 2}
                      y={imgY - thumbSize / 2}
                      width={thumbSize}
                      height={thumbSize}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                    <circle
                      cx={imgX}
                      cy={imgY}
                      r={thumbSize / 2}
                      fill="none"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}
            </>
          ) : (
            <text
              x={tx} y={ty}
              fill="white"
              fontSize={fontSize}
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${textRotation}, ${tx}, ${ty})`}
              style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {displayTerm}
            </text>
          )}
        </g>
      );
    }

    return { segments, defs: clipDefs.length > 0 ? clipDefs : null };
  }, [remainingCards]);

  const cardDisplay = selectedCard ? getCardDisplay(selectedCard) : null;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      <header className="flex items-center justify-between p-4 sm:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[var(--color-text-secondary)] tabular-nums">
            {completedCount} / {totalCards} done
          </span>
          {skippedCount > 0 && (
            <span className="text-xs text-[var(--color-text-tertiary)]">
              ({skippedCount} image-only skipped)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={isSpinning} className="gap-1.5">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button variant="ghost" onClick={() => setShowExitConfirm(true)} aria-label="Exit">
            <X className="w-5 h-5 shrink-0" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 gap-6">
        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">All Done!</h2>
              <p className="text-[var(--color-text-secondary)] mt-2">
                You've reviewed all {totalCards} cards.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleReset}>Spin Again</Button>
              <Button onClick={onExit}>Back to Set</Button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Wheel */}
            <div className="relative">
              {/* Pointer triangle at top */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                <div
                  className="w-0 h-0"
                  style={{
                    borderLeft: '14px solid transparent',
                    borderRight: '14px solid transparent',
                    borderTop: '22px solid var(--color-primary)',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}
                />
              </div>

              {/* SVG Wheel — rotation animated via Framer Motion on motion.g */}
              <div className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px]">
                <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-xl">
                  {wheelContent.defs && <defs>{wheelContent.defs}</defs>}
                  {/* Outer ring (doesn't rotate) */}
                  <circle cx="200" cy="200" r="198" fill="none" stroke="var(--color-border)" strokeWidth="4" />
                  {/* Rotating group — Framer Motion handles the animation */}
                  <motion.g
                    animate={{ rotate: rotation }}
                    transition={{
                      duration: SPIN_DURATION / 1000,
                      ease: [0.17, 0.67, 0.12, 0.99],
                    }}
                    style={{ transformOrigin: '200px 200px' }}
                  >
                    {wheelContent.segments}
                  </motion.g>
                  {/* Center hub (doesn't rotate) */}
                  <circle cx="200" cy="200" r="28" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="3" />
                  <circle cx="200" cy="200" r="8" fill="var(--color-primary)" />
                </svg>
              </div>
            </div>

            {/* Spin button */}
            <motion.button
              onClick={handleSpin}
              disabled={isSpinning || remainingCards.length === 0}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSpinning ? 'Spinning...' : 'SPIN!'}
            </motion.button>

            <p className="text-sm text-[var(--color-text-tertiary)]">
              {remainingCards.length} card{remainingCards.length !== 1 ? 's' : ''} remaining
            </p>
          </>
        )}
      </main>

      {/* Flashcard overlay */}
      <AnimatePresence>
        {selectedCard && cardDisplay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleDismissCard();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-md"
            >
              <div
                className="relative w-full min-h-[300px] rounded-2xl cursor-pointer"
                style={{ perspective: 1000 }}
                onClick={() => setFlipped((f) => !f)}
              >
                <motion.div
                  className="relative w-full min-h-[300px] rounded-2xl"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                >
                  {/* Front — Prompt */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-2xl bg-[var(--color-surface)] shadow-2xl border border-[var(--color-border)] overflow-y-auto"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-4">
                      {cardDisplay.promptLabel}
                    </span>
                    <div
                      className="text-xl text-[var(--color-text)] text-center study-content"
                      dangerouslySetInnerHTML={{ __html: cardDisplay.prompt }}
                    />
                    <span className="mt-6 text-sm text-[var(--color-text-tertiary)]">Tap to flip</span>
                  </div>

                  {/* Back — Answer */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-2xl bg-[var(--color-surface)] shadow-2xl border border-[var(--color-border)] overflow-y-auto"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-4">
                      {cardDisplay.answerLabel}
                    </span>
                    <div
                      className="text-xl text-[var(--color-text)] text-center study-content"
                      dangerouslySetInnerHTML={{ __html: cardDisplay.answer }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismissCard(); }}
                      className="mt-6 px-6 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-shadow"
                    >
                      Got it — Remove & Continue
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={showExitConfirm}
        title="Exit spinner?"
        confirmLabel="Exit"
        cancelLabel="Cancel"
        danger
        onConfirm={onExit}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}
