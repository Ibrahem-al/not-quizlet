export type GameStatus = 'idle' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'finished';

export interface LiveQuestion {
  questionIndex: number;
  term: string;           // HTML string from Card.term
  imageData?: string;
  options: string[];      // 4 HTML strings (definitions), shuffled
  correctOptionIndex: number;
  correctOptionIndices: number[];
  timeLimitMs: number;
}

export interface PlayerEntry {
  playerToken: string;
  nickname: string;
  score: number;
  streak: number;
  isOnline: boolean;
}

export interface ReceivedAnswer {
  playerToken: string;
  chosenOption: number;
  timeTakenMs: number;
  isCorrect: boolean;
  pointsEarned: number;
}

// Broadcast event payloads
export interface QuestionShowPayload {
  questionIndex: number;
  term: string;
  imageData?: string;
  options: string[];       // correctOptionIndex intentionally omitted for players
  timeLimitMs: number;
  hostTimestamp: number;   // Date.now() when host broadcast — for clock sync
}

export interface TimerSyncPayload {
  remainingMs: number;
  questionIndex: number;
}

export interface AnswerRevealPayload {
  correctOptionIndex: number;
  correctOptionIndices: number[];
  perPlayer: Record<string, { chosenOption: number; isCorrect: boolean; pointsEarned: number }>;
}

export interface LeaderboardPayload {
  rankings: Array<{ playerToken: string; nickname: string; score: number; streak: number }>;
  questionIndex: number;
  totalQuestions: number;
}

export interface NextQuestionPayload {
  questionIndex: number;
}

export interface FinishedPayload {
  finalRankings: Array<{ playerToken: string; nickname: string; score: number }>;
}

export interface PlayerAnswerPayload {
  playerToken: string;
  questionIndex: number;
  chosenOption: number;
  timeTakenMs: number;
}

export interface PlayerJoinedPayload {
  playerToken: string;
  nickname: string;
}
