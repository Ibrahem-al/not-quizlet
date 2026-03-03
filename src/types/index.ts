/**
 * StudyFlow data models – match spec exactly.
 */

export interface ReviewLog {
  date: number;
  quality: number; // 0–5
  timeSpent: number; // milliseconds
  mode: 'flashcards' | 'learn' | 'match' | 'test';
}

/** FSRS state (optional). When set, scheduling uses FSRS instead of SM-2. */
export interface FSRSState {
  stability: number;
  difficulty: number;
  state: number; // 0 New, 1 Learning, 2 Review, 3 Relearning
  lastReview: number; // timestamp
}

export interface Card {
  id: string;
  term: string; // supports rich text (html string)
  definition: string;
  imageData?: string; // base64, max 500kb per image
  audioData?: string; // base64, optional
  difficulty: number; // SM-2: 0–5 scale (legacy)
  repetition: number; // SM-2: repetition count (legacy)
  interval: number; // SM-2: days until next review (legacy)
  efFactor: number; // SM-2: easiness factor (default 2.5) (legacy)
  nextReviewDate: number; // timestamp
  history: ReviewLog[];
  /** When set, FSRS is used for scheduling; otherwise SM-2 (legacy). */
  fsrs?: FSRSState;
}

export interface StudySet {
  id: string; // UUID v4
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  cards: Card[];
  lastStudied: number;
  studyStats: {
    totalSessions: number;
    averageAccuracy: number;
    streakDays: number;
  };
  /**
   * Legacy visibility field - replaced by sharingMode.
   * @deprecated Use sharingMode instead
   */
  visibility: 'private' | 'public';
  userId?: string; // Owner user ID (set by cloud sync)
  // New sharing fields
  sharingMode: 'private' | 'restricted' | 'link' | 'public';
  folderId?: string;
  effectivePermissions?: 'owner' | 'editor' | 'viewer';
}

export interface Settings {
  id?: number;
  voice?: string;
  speechRate?: number; // 0.8–1.5
  [key: string]: unknown;
}
