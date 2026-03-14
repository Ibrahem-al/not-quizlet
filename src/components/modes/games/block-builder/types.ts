import type { Card } from '../../../../types';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type AnswerDirection = 'term-to-definition' | 'definition-to-term' | 'both';
export type GamePhase = 'config' | 'playing' | 'won' | 'lost';
export type QuestionType = 'written' | 'multiple' | 'truefalse';

export interface BlockBuilderConfig {
  answerDirection: AnswerDirection;
  questionTypes: {
    written: boolean;
    multiple: boolean;
    truefalse: boolean;
  };
  questionCount: number;
  difficulty: Difficulty;
  infinityMode: boolean;
  multiAnswerMC: boolean;
}

export interface BlockBuilderQuestion {
  card: Card;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctOption?: number;
  correctOptionIndices?: number[];
  equivalentAnswers?: string[];
  isTrue?: boolean;
  answerWith: 'term' | 'definition';
}

export interface GameState {
  phase: GamePhase;
  blocks: number;
  score: number;
  lavaHeight: number;
  currentQuestionIndex: number;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  streak: number;
  maxBlocks: number;
  startTime: number;
  lastAnswerCorrect: boolean | null;
  questionStartTime: number;
}

export const BLOCK_HEIGHT_PX = 40;
export const INITIAL_BLOCKS = 3;
export const TOWER_CONTAINER_HEIGHT = 480;

export const DIFFICULTY_SPEEDS: Record<Difficulty, { base: number; accel: number }> = {
  easy:   { base: 3,   accel: 0 },
  medium: { base: 2.5, accel: 0.08 },
  hard:   { base: 3,   accel: 0.15 },
};

export const BLOCK_PENALTY: Record<Difficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};
