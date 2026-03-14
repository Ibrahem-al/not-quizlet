import { useState, useCallback, useRef, useMemo } from 'react';
import { shuffle } from '../../../../lib/algorithms';
import { buildEquivalenceGroups, areMatchableByContent } from '../../../../lib/equivalence';
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
  const groups = useMemo(() => buildEquivalenceGroups(cards), [cards]);
  const maxPairs = cards.length;
  const [pairCount, setPairCount] = useState(() => Math.min(6, cards.length));
  const lockRef = useRef(false);

  const [gameState, setGameState] = useState<MemoryGameState>(() => ({
    phase: 'setup',
    tiles: [],
    flippedIndices: [],
    matchedTileIndices: new Set(),
    moves: 0,
    startTime: Date.now(),
    endTime: null,
  }));

  const startGame = useCallback((selectedPairCount: number) => {
    setPairCount(selectedPairCount);
    lockRef.current = false;
    setGameState({
      phase: 'playing',
      tiles: buildTiles(cards, selectedPairCount),
      flippedIndices: [],
      matchedTileIndices: new Set(),
      moves: 0,
      startTime: Date.now(),
      endTime: null,
    });
  }, [cards]);

  const flipTile = useCallback((index: number) => {
    if (lockRef.current) return;

    setGameState((prev) => {
      // Can't flip matched or already flipped tiles
      if (prev.matchedTileIndices.has(index)) return prev;
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
      // Content-based matching: must be different types (term vs definition)
      // and content must be matchable via equivalence groups
      const termTile = first.type === 'term' ? first : second;
      const defTile = first.type === 'definition' ? first : second;
      const isMatch = first.type !== second.type && areMatchableByContent(termTile.content, defTile.content, groups);
      const newMoves = prev.moves + 1;

      if (isMatch) {
        // Lock input and show both cards flipped for a moment before marking matched
        lockRef.current = true;
        setTimeout(() => {
          setGameState((s) => {
            const newMatched = new Set(s.matchedTileIndices);
            newMatched.add(firstIdx);
            newMatched.add(secondIdx);
            const allDone = newMatched.size === pairCount * 2;
            return {
              ...s,
              flippedIndices: [],
              matchedTileIndices: newMatched,
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
      phase: 'setup',
      tiles: [],
      flippedIndices: [],
      matchedTileIndices: new Set(),
      moves: 0,
      startTime: Date.now(),
      endTime: null,
    });
  }, []);

  return { gameState, pairCount, maxPairs, flipTile, resetGame, startGame };
}
