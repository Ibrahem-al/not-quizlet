import type { Card } from '../../../../types';

export type AnswerDirection = 'term-to-definition' | 'definition-to-term' | 'both';
export type GamePhase = 'config' | 'question' | 'rolling' | 'moving' | 'finished';
export type QuestionType = 'written' | 'multiple' | 'truefalse';

export interface RaceConfig {
  playerCount: number;
  pathLength: number;
  answerDirection: AnswerDirection;
  questionTypes: {
    written: boolean;
    multiple: boolean;
    truefalse: boolean;
  };
}

export interface Player {
  id: number;
  name: string;
  position: number;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
}

export interface Shortcut {
  from: number;
  to: number;
}

export interface BoardCell {
  index: number;
  content: string;
  label: 'Term' | 'Definition';
  shortcutTo?: number;
}

export interface RaceQuestion {
  card: Card;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctOption?: number;
  isTrue?: boolean;
  answerWith: 'term' | 'definition';
}

export interface PendingMove {
  playerId: number;
  fromPos: number;
  toPos: number;         // before shortcut
  shortcutTo?: number;   // after shortcut (if any)
  steps: number;         // dice value
}

export interface RaceGameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number;
  boardCells: BoardCell[];
  shortcuts: Shortcut[];
  winner: Player | null;
  questionsAnswered: number;
  correctAnswers: number;
  layoutSeed: number;
  pendingMove: PendingMove | null;
}

export const PLAYER_THEMES: { color: string; bgColor: string; borderColor: string; emoji: string }[] = [
  { color: 'text-blue-600', bgColor: 'bg-blue-500', borderColor: 'border-blue-500', emoji: '🚀' },
  { color: 'text-red-600', bgColor: 'bg-red-500', borderColor: 'border-red-500', emoji: '🔥' },
  { color: 'text-green-600', bgColor: 'bg-green-500', borderColor: 'border-green-500', emoji: '🌿' },
  { color: 'text-purple-600', bgColor: 'bg-purple-500', borderColor: 'border-purple-500', emoji: '⚡' },
];
