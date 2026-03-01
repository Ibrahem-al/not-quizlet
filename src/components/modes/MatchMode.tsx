import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '../ui';
import { MatchTile, type MatchTileData } from '../study/MatchTile';
import { Timer } from '../study/Timer';
import { shuffle } from '../../lib/algorithms';
import type { Card } from '../../types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
}

interface MatchModeProps {
  cards: Card[];
  onExit: () => void;
}

function buildTiles(cards: Card[], pairCount: number): MatchTileData[] {
  const selected = shuffle(cards).slice(0, pairCount);
  const tiles: MatchTileData[] = [];
  selected.forEach((card) => {
    tiles.push({ cardId: card.id, text: card.term.replace(/<[^>]*>/g, ''), type: 'term' });
    tiles.push({ cardId: card.id, text: card.definition, type: 'definition' });
  });
  return shuffle(tiles);
}

export function MatchMode({ cards, onExit }: MatchModeProps) {
  const startTimeRef = useRef(Date.now());
  const pairCount = Math.min(8, Math.floor(cards.length / 2));
  const tiles = useMemo(() => buildTiles(cards, pairCount), [cards]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const [finalTimeMs, setFinalTimeMs] = useState<number | null>(null);

  const handleDrop = (dragged: MatchTileData, target: MatchTileData) => {
    if (dragged.type === target.type) return;
    if (dragged.cardId !== target.cardId) return;
    setMatchedPairs((prev) => new Set(prev).add(dragged.cardId));
  };

  const matchedCount = matchedPairs.size;
  useEffect(() => {
    if (matchedCount === pairCount && pairCount > 0) {
      setFinalTimeMs(Date.now() - startTimeRef.current);
      setDone(true);
      setRunning(false);
      confetti({ particleCount: 80, spread: 60 });
    }
  }, [matchedCount, pairCount]);

  if (cards.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-[var(--color-text-secondary)]">Need at least 2 cards to play Match.</p>
        <p className="text-sm text-[var(--color-text-secondary)]">Add cards to this set first.</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 border-b border-[var(--color-text-secondary)]/20 bg-[var(--color-surface)]">
        <Timer running={running} className="text-lg" />
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {matchedCount} / {pairCount} pairs
        </span>
        <Button variant="ghost" onClick={onExit} aria-label="Exit">
          Exit
        </Button>
      </header>

      <main className="flex-1 p-4 overflow-auto">
        {done ? (
          <motion.div
            className="flex flex-col items-center justify-center min-h-[50vh] gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
          >
            <h2 className="text-xl font-bold text-[var(--color-text)]">All matched!</h2>
            {finalTimeMs != null && (
              <span className="font-mono text-2xl text-[var(--color-text)]">
                {formatTime(finalTimeMs)}
              </span>
            )}
            <Button onClick={onExit}>Back to set</Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {tiles.map((tile, i) => (
              <MatchTile
                key={`${tile.cardId}-${tile.type}-${i}`}
                cardId={tile.cardId}
                text={tile.text}
                type={tile.type}
                matched={matchedPairs.has(tile.cardId)}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
