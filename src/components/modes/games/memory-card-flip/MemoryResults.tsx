import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '../../../ui';

interface MemoryResultsProps {
  moves: number;
  pairCount: number;
  elapsedMs: number;
  onPlayAgain: () => void;
  onExit: () => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
}

function getRating(moves: number, pairCount: number): { label: string; emoji: string } {
  const ratio = moves / pairCount;
  if (ratio <= 1.2) return { label: 'Perfect Memory!', emoji: '🧠' };
  if (ratio <= 1.8) return { label: 'Excellent!', emoji: '🌟' };
  if (ratio <= 2.5) return { label: 'Great Job!', emoji: '👏' };
  if (ratio <= 3.5) return { label: 'Good Work!', emoji: '👍' };
  return { label: 'Keep Practicing!', emoji: '💪' };
}

export function MemoryResults({ moves, pairCount, elapsedMs, onPlayAgain, onExit }: MemoryResultsProps) {
  const rating = getRating(moves, pairCount);

  useEffect(() => {
    confetti({ particleCount: 80, spread: 60 });
  }, []);

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-5 p-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <span className="text-5xl">{rating.emoji}</span>
      <h2 className="text-2xl font-bold text-[var(--color-text)]">{rating.label}</h2>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xs text-center">
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
          <div className="text-2xl font-bold text-[var(--color-text)]">{moves}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Moves</div>
        </div>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
          <div className="text-2xl font-bold text-[var(--color-text)]">{formatTime(elapsedMs)}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Time</div>
        </div>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
          <div className="text-2xl font-bold text-[var(--color-text)]">{pairCount}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Pairs</div>
        </div>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
          <div className="text-2xl font-bold text-[var(--color-text)]">
            {Math.round((pairCount / moves) * 100)}%
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">Accuracy</div>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <Button variant="ghost" onClick={onExit}>Exit</Button>
        <Button onClick={onPlayAgain}>Play Again</Button>
      </div>
    </motion.div>
  );
}
