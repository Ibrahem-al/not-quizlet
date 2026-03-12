import { shuffle } from './algorithms';
import type { Card } from '../types';
import type { LiveQuestion } from '../types/liveGame';

const BASE_POINTS = 1000;
const TIME_BONUS_MAX = 500;
const STREAK_BONUS_PER = 50;
const STREAK_BONUS_MAX = 300;

export function buildQuestions(cards: Card[]): LiveQuestion[] {
  const shuffledCards = shuffle([...cards]);

  return shuffledCards.map((card, questionIndex) => {
    const others = cards.filter((c) => c.id !== card.id);
    const wrongPool = shuffle(others).slice(0, 3).map((c) => c.definition);

    // Pad if fewer than 3 other cards exist
    while (wrongPool.length < 3) {
      wrongPool.push(wrongPool[wrongPool.length - 1] ?? card.definition);
    }

    const allOptions = shuffle([card.definition, ...wrongPool]);
    const correctOptionIndex = allOptions.indexOf(card.definition);

    return {
      questionIndex,
      term: card.term,
      imageData: card.imageData,
      options: allOptions,
      correctOptionIndex,
      timeLimitMs: 15000,
    };
  });
}

export function calculatePoints(
  isCorrect: boolean,
  timeTakenMs: number,
  timeLimitMs: number,
  currentStreak: number
): { points: number; newStreak: number } {
  if (!isCorrect) {
    return { points: 0, newStreak: 0 };
  }

  const timeRatio = Math.max(0, 1 - timeTakenMs / timeLimitMs);
  const timeBonus = Math.round(TIME_BONUS_MAX * timeRatio);
  const streakBonus = Math.min(currentStreak * STREAK_BONUS_PER, STREAK_BONUS_MAX);

  return {
    points: BASE_POINTS + timeBonus + streakBonus,
    newStreak: currentStreak + 1,
  };
}

const PLAYER_TOKEN_KEY = 'liveGamePlayerToken';
const PLAYER_GAME_KEY = 'liveGameCode';
const PLAYER_NICKNAME_KEY = 'liveGameNickname';

export function generatePlayerToken(): string {
  const existing = sessionStorage.getItem(PLAYER_TOKEN_KEY);
  if (existing) return existing;
  const token = crypto.randomUUID();
  sessionStorage.setItem(PLAYER_TOKEN_KEY, token);
  return token;
}

export function savePlayerSession(gameCode: string, nickname: string) {
  sessionStorage.setItem(PLAYER_GAME_KEY, gameCode);
  sessionStorage.setItem(PLAYER_NICKNAME_KEY, nickname);
}

export function loadPlayerSession(): { gameCode: string; nickname: string; playerToken: string } | null {
  const gameCode = sessionStorage.getItem(PLAYER_GAME_KEY);
  const nickname = sessionStorage.getItem(PLAYER_NICKNAME_KEY);
  const playerToken = sessionStorage.getItem(PLAYER_TOKEN_KEY);
  if (!gameCode || !nickname || !playerToken) return null;
  return { gameCode, nickname, playerToken };
}

export function clearPlayerSession() {
  sessionStorage.removeItem(PLAYER_TOKEN_KEY);
  sessionStorage.removeItem(PLAYER_GAME_KEY);
  sessionStorage.removeItem(PLAYER_NICKNAME_KEY);
}

/** Extract plain text from HTML string for display purposes */
export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/** Hash a string to a consistent number (for deterministic avatar colors) */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export function getAvatarColor(nickname: string): string {
  return AVATAR_COLORS[hashString(nickname) % AVATAR_COLORS.length];
}
