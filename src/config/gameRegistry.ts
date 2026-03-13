import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Blocks, FlipVertical2 } from 'lucide-react';
import type { Card } from '../types';

export type GameCategory = 'word' | 'memory' | 'speed' | 'puzzle' | 'quiz';

export interface GameModeProps {
  cards: Card[];
  setId: string;
  onExit: () => void;
}

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  category: GameCategory;
  tags: string[];
  minCards: number;
  component: LazyExoticComponent<ComponentType<GameModeProps>>;
}

export const gameCategories: Record<GameCategory, { label: string; color: string }> = {
  word:   { label: 'Word Games', color: 'text-blue-500' },
  memory: { label: 'Memory',     color: 'text-purple-500' },
  speed:  { label: 'Speed',      color: 'text-orange-500' },
  puzzle: { label: 'Puzzle',     color: 'text-emerald-500' },
  quiz:   { label: 'Quiz',       color: 'text-pink-500' },
};

// ──────────────────────────────────────────────
// THE REGISTRY — add new games here.
//
// Example:
//   {
//     id: 'word-scramble',
//     name: 'Word Scramble',
//     description: 'Unscramble letters to form the correct term.',
//     icon: Shuffle,
//     color: 'from-blue-500 to-cyan-500',
//     category: 'word',
//     tags: ['spelling', 'vocabulary'],
//     minCards: 4,
//     component: lazy(() => import('../components/modes/games/WordScrambleMode')),
//   },
// ──────────────────────────────────────────────
export const gameRegistry: GameDefinition[] = [
  {
    id: 'block-builder',
    name: 'Block Builder',
    description: 'Build a tower by answering questions. Stay above the rising lava!',
    icon: Blocks,
    color: 'from-orange-500 to-red-500',
    category: 'quiz',
    tags: ['tower', 'survival', 'lava', 'building', 'blocks'],
    minCards: 4,
    component: lazy(() => import('../components/modes/games/BlockBuilderMode')),
  },
  {
    id: 'memory-card-flip',
    name: 'Memory Card Flip',
    description: 'Flip cards to find matching term-definition pairs. Clear the board in as few moves as possible!',
    icon: FlipVertical2,
    color: 'from-violet-500 to-purple-500',
    category: 'memory',
    tags: ['memory', 'matching', 'cards', 'flip', 'pairs', 'concentration'],
    minCards: 2,
    component: lazy(() => import('../components/modes/games/MemoryCardFlipMode')),
  },
];
