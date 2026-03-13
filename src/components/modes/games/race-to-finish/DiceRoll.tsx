import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceRollProps {
  onRollComplete: (value: number) => void;
  playerColor: string;
  playerEmoji: string;
  playerName: string;
}

const DICE_FACES: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DiceFace({ value }: { value: number }) {
  const dots = DICE_FACES[value] || DICE_FACES[1];

  return (
    <div className="w-24 h-24 bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-2 grid grid-rows-3 grid-cols-3 gap-0">
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const hasDot = dots.some(([r, c]) => r === row && c === col);

        return (
          <div key={i} className="flex items-center justify-center">
            {hasDot && (
              <div className="w-4 h-4 rounded-full bg-gray-800" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DiceRoll({ onRollComplete, playerColor, playerEmoji, playerName }: DiceRollProps) {
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'landed'>('idle');
  const [displayValue, setDisplayValue] = useState(1);
  const finalResultRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleRoll = useCallback(() => {
    if (phase !== 'idle') return;

    // Determine result up front
    const result = Math.floor(Math.random() * 6) + 1;
    finalResultRef.current = result;

    setPhase('rolling');

    // Cycle through random faces while rolling
    intervalRef.current = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
    }, 70);

    // Stop rolling after 1.2s — show final result
    setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Force the correct final value
      setDisplayValue(finalResultRef.current);
      setPhase('landed');

      // Notify parent after a short pause
      setTimeout(() => {
        onRollComplete(finalResultRef.current);
      }, 900);
    }, 1200);
  }, [phase, onRollComplete]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-lg font-bold text-[var(--color-text)]">
          <span className="text-2xl mr-2">{playerEmoji}</span>
          {playerName}
        </p>
        <p className={`text-sm font-medium ${playerColor} mt-1`}>
          answered correctly! Roll the dice!
        </p>
      </motion.div>

      {/* Dice with rolling animation wrapper */}
      <motion.div
        animate={
          phase === 'rolling'
            ? {
                rotate: [0, 15, -15, 10, -10, 0],
                scale: [1, 1.1, 0.95, 1.08, 1],
                y: [0, -20, 0, -12, 0],
              }
            : phase === 'landed'
            ? { rotate: 0, scale: [1.15, 1], y: 0 }
            : { rotate: 0, scale: 1, y: 0 }
        }
        transition={
          phase === 'rolling'
            ? { duration: 0.4, repeat: Infinity, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 400, damping: 15 }
        }
      >
        <DiceFace value={displayValue} />
      </motion.div>

      <AnimatePresence>
        {phase === 'landed' && (
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl font-bold text-[var(--color-text)]"
          >
            Move {finalResultRef.current} space{finalResultRef.current !== 1 ? 's' : ''}!
          </motion.p>
        )}
      </AnimatePresence>

      {phase === 'idle' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <button
            onClick={handleRoll}
            className="px-8 py-3 rounded-xl bg-[var(--color-primary)] text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow active:scale-95"
          >
            Roll Dice
          </button>
        </motion.div>
      )}

      {phase === 'rolling' && (
        <p className="text-sm text-[var(--color-text-secondary)] animate-pulse">Rolling...</p>
      )}
    </div>
  );
}
