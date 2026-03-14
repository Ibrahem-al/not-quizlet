export interface MemoryTile {
  id: string;       // unique tile id
  cardId: string;   // study card id (shared by term+definition pair)
  content: string;  // HTML content to display
  type: 'term' | 'definition';
}

export type GamePhase = 'setup' | 'playing' | 'complete';

export interface MemoryGameState {
  phase: GamePhase;
  tiles: MemoryTile[];
  flippedIndices: number[];   // currently face-up (max 2)
  matchedTileIndices: Set<number>; // tile indices that have been matched
  moves: number;               // total flip-pairs attempted
  startTime: number;
  endTime: number | null;
}

// Grid sizing based on pair count
export function getGridCols(pairCount: number): string {
  if (pairCount <= 4) return 'grid-cols-2 sm:grid-cols-4';
  if (pairCount <= 6) return 'grid-cols-3 sm:grid-cols-4';
  return 'grid-cols-4 sm:grid-cols-4';
}
