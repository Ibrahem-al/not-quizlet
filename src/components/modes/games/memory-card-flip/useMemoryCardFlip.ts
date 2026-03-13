import { useState, useCallback, useRef } from 'react';
import { shuffle } from '../../../../lib/algorithms';
import type { Card } from '../../../../types';
import type { MemoryTile, MemoryGameState } from './types';

function buildTiles(cards: Card[], pairCount: number): MemoryTile[] {
  const selected = shuffle(cards).slice(0, pairCount);
  const tiles: MemoryTile[] = [];
  selected.forEach((card) => {
    tiles.push({ id: `${card.id}-term`, cardId: card.id, content: card.term, type: 'term' });
    tiles.push({ id: `${card.id}-def`, cardId: card.id, content: card.definition, type: 'definition' });
  });
  return shuffle(tiles);
}

export function useMemoryCardFlip(cards: Card[]) {
  const pairCount = Math.min(8, cards.length);
  const lockRef = useRef(false);

  const [gameState, setGameState] = useState<MemoryGameState>(() => ({
    phase: 'playing',
    tiles: buildTiles(cards, pairCount),
    flippedIndices: [],
    matchedCardIds: new Set(),
    moves: 0,
    startTime: Date.now(),
    endTime: null,
  }));

  const flipTile = useCallback((index: number) => {
    if (lockRef.current) return;

    setGameState((prev) => {
      // Can't flip matched or already flipped tiles
      const tile = prev.tiles[index];
      if (prev.matchedCardIds.has(tile.cardId)) return prev;
      if (prev.flippedIndices.includes(index)) return prev;
      if (prev.flippedIndices.length >= 2) return prev;

      const newFlipped = [...prev.flippedIndices, index];

      // First card flipped — just reveal it
      if (newFlipped.length === 1) {
        return { ...prev, flippedIndices: newFlipped };
      }

      // Second card flipped — check for match
      const [firstIdx, secondIdx] = newFlipped;
      const first = prev.tiles[firstIdx];
      const second = prev.tiles[secondIdx];
      const isMatch = first.cardId === second.cardId && first.type !== second.type;
      const newMoves = prev.moves + 1;

      if (isMatch) {
        // Lock input and show both cards flipped for a moment before marking matched
        lockRef.current = true;
        setTimeout(() => {
          setGameState((s) => {
            const newMatched = new Set(s.matchedCardIds);
            newMatched.add(first.cardId);
            const allDone = newMatched.size === pairCount;
            return {
              ...s,
              flippedIndices: [],
              matchedCardIds: newMatched,
              phase: allDone ? 'complete' : 'playing',
              endTime: allDone ? Date.now() : null,
            };
          });
          lockRef.current = false;
        }, 600);

        return { ...prev, flippedIndices: newFlipped, moves: newMoves };
      }

      // Not a match — lock and flip back after delay
      lockRef.current = true;
      setTimeout(() => {
        setGameState((s) => ({ ...s, flippedIndices: [] }));
        lockRef.current = false;
      }, 800);

      return { ...prev, flippedIndices: newFlipped, moves: newMoves };
    });
  }, [pairCount]);

  const resetGame = useCallback(() => {
    lockRef.current = false;
    setGameState({
      phase: 'playing',
      tiles: buildTiles(cards, pairCount),
      flippedIndices: [],
      matchedCardIds: new Set(),
      moves: 0,
      startTime: Date.now(),
      endTime: null,
    });
  }, [cards, pairCount]);

  return { gameState, pairCount, flipTile, resetGame };
}
