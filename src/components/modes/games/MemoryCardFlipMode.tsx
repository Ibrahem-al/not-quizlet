import { Button } from '../../ui';
import type { GameModeProps } from '../../../config/gameRegistry';
import { useMemoryCardFlip } from './memory-card-flip/useMemoryCardFlip';
import { MemoryCard } from './memory-card-flip/MemoryCard';
import { MemoryResults } from './memory-card-flip/MemoryResults';
import { getGridCols } from './memory-card-flip/types';

export default function MemoryCardFlipMode({ cards, onExit }: GameModeProps) {
  const { gameState, pairCount, flipTile, resetGame } = useMemoryCardFlip(cards);

  if (cards.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-[var(--color-text-secondary)]">Need at least 2 cards to play.</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <span className="text-sm font-semibold text-[var(--color-text)]">Memory Card Flip</span>
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {gameState.matchedCardIds.size} / {pairCount} pairs &middot; {gameState.moves} moves
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
