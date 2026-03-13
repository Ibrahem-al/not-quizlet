import { useState } from 'react';
import { Button } from '../../ui';
import type { GameModeProps } from '../../../config/gameRegistry';
import { useMemoryCardFlip } from './memory-card-flip/useMemoryCardFlip';
import { MemoryCard } from './memory-card-flip/MemoryCard';
import { MemoryResults } from './memory-card-flip/MemoryResults';
import { getGridCols } from './memory-card-flip/types';

function SetupScreen({ maxMatches, defaultMatches, onStart, onExit }: {
  maxMatches: number;
  defaultMatches: number;
  onStart: (matches: number) => void;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState(defaultMatches);
  const totalTiles = selected * 2;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-8 p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg max-w-md w-full mx-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">Memory Card Flip</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Match terms with their definitions by flipping tiles
          </p>
        </div>

        <div className="w-full">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3 text-center">
            How many matches?
          </label>

          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => setSelected((s) => Math.max(2, s - 1))}
              className="w-10 h-10 rounded-lg font-bold text-xl bg-[var(--color-background)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
            >
              &minus;
            </button>
            <span className="text-4xl font-bold text-[var(--color-primary)] w-16 text-center tabular-nums">
              {selected}
            </span>
            <button
              onClick={() => setSelected((s) => Math.min(maxMatches, s + 1))}
              className="w-10 h-10 rounded-lg font-bold text-xl bg-[var(--color-background)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
            >
              +
            </button>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] text-center mt-2">
            min 2 &middot; max {maxMatches} (based on your set)
          </p>
        </div>

        <div className="w-full rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] p-4">
          <div className="flex justify-around items-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">{selected}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">matches to find</p>
            </div>
            <div className="text-[var(--color-text-secondary)] text-lg">&rarr;</div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-text)]">{totalTiles}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">tiles on board</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <Button variant="secondary" onClick={onExit} className="flex-1">
            Back
          </Button>
          <Button onClick={() => onStart(selected)} className="flex-1">
            Start Game
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MemoryCardFlipMode({ cards, onExit }: GameModeProps) {
  const { gameState, pairCount, maxPairs, flipTile, resetGame, startGame } = useMemoryCardFlip(cards);

  if (cards.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-[var(--color-text-secondary)]">Need at least 2 cards to play.</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }

  if (gameState.phase === 'setup') {
    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <SetupScreen
          maxMatches={maxPairs}
          defaultMatches={Math.min(6, maxPairs)}
          onStart={startGame}
          onExit={onExit}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <span className="text-sm font-semibold text-[var(--color-text)]">Memory Card Flip</span>
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {gameState.matchedCardIds.size} / {pairCount} matches &middot; {gameState.moves} moves
        </span>
        <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {gameState.phase === 'complete' ? (
          <MemoryResults
            moves={gameState.moves}
            pairCount={pairCount}
            elapsedMs={(gameState.endTime ?? Date.now()) - gameState.startTime}
            onPlayAgain={resetGame}
            onExit={onExit}
          />
        ) : (
          <div className={`grid ${getGridCols(pairCount)} gap-3 max-w-2xl w-full mx-auto`}>
            {gameState.tiles.map((tile, i) => (
              <MemoryCard
                key={tile.id}
                content={tile.content}
                type={tile.type}
                isFlipped={gameState.flippedIndices.includes(i)}
                isMatched={gameState.matchedCardIds.has(tile.cardId)}
                onClick={() => flipTile(i)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
