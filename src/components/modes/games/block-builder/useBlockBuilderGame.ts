import { useState, useRef, useCallback, useEffect } from 'react';
import { shuffle, gradeWrittenAnswer } from '../../../../lib/algorithms';
import type { Card } from '../../../../types';
import type {
  BlockBuilderConfig,
  BlockBuilderQuestion,
  GameState,
  QuestionType,
} from './types';
import {
  BLOCK_HEIGHT_PX,
  INITIAL_BLOCKS,
  BLOCK_PENALTY,
  DIFFICULTY_SPEEDS,
} from './types';

/* ── helpers (same logic as TestMode) ── */

function isImageOnly(content: string): boolean {
  if (!content) return false;
  const withoutImages = content.replace(/<img[^>]*>/gi, '');
  const textContent = withoutImages.replace(/<[^>]*>/g, '').trim();
  return textContent === '' && content.includes('<img');
}

function getTextContent(content: string): string {
  return content.replace(/<[^>]*>/g, '').trim();
}

function hasTextContent(content: string): boolean {
  return getTextContent(content).length > 0;
}

function selectCardsForQuestions(cards: Card[], count: number): Card[] {
  if (count <= cards.length) return shuffle(cards).slice(0, count);
  const result: Card[] = [];
  const full = Math.floor(count / cards.length);
  const rem = count % cards.length;
  for (let i = 0; i < full; i++) result.push(...cards);
  result.push(...shuffle([...cards]).slice(0, rem));
  return shuffle(result);
}

/* ── question generation ── */

function generateQuestions(
  cards: Card[],
  config: BlockBuilderConfig,
): BlockBuilderQuestion[] {
  const types: QuestionType[] = [];
  if (config.questionTypes.written) types.push('written');
  if (config.questionTypes.multiple) types.push('multiple');
  if (config.questionTypes.truefalse) types.push('truefalse');
  if (types.length === 0) types.push('written');

  const count = config.infinityMode ? Math.max(cards.length, 20) : config.questionCount;
  const selected = selectCardsForQuestions(cards, count);
  const questions: BlockBuilderQuestion[] = [];

  selected.forEach((card) => {
    const isTermImg = isImageOnly(card.term);
    const isDefImg = isImageOnly(card.definition);
    const termText = hasTextContent(card.term);
    const defText = hasTextContent(card.definition);

    let answerWith: 'term' | 'definition';
    if (isTermImg && defText) answerWith = 'definition';
    else if (isDefImg && termText) answerWith = 'term';
    else if (config.answerDirection === 'both') answerWith = Math.random() > 0.5 ? 'definition' : 'term';
    else answerWith = config.answerDirection === 'term-to-definition' ? 'definition' : 'term';

    let available = types;
    if (isTermImg && isDefImg) {
      available = types.filter((t) => t !== 'written');
      if (available.length === 0) return;
    }

    const type = available[Math.floor(Math.random() * available.length)];
    const prompt = answerWith === 'definition' ? card.term : card.definition;

    if (type === 'multiple') {
      const others = cards.filter((c) => c.id !== card.id);
      const wrong = shuffle(others)
        .slice(0, 3)
        .map((c) => (answerWith === 'term' ? c.term : c.definition));
      const correct = answerWith === 'term' ? card.term : card.definition;
      const options = shuffle([correct, ...wrong]);
      questions.push({ card, type, prompt, options, correctOption: options.indexOf(correct), answerWith });
    } else if (type === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      let shown: string;
      const answer = answerWith === 'term' ? card.term : card.definition;
      if (isTrue) {
        shown = answer;
      } else if (cards.length > 1) {
        const other = shuffle(cards.filter((c) => c.id !== card.id))[0];
        shown = answerWith === 'term' ? other.term : other.definition;
      } else {
        shown = answer;
      }
      questions.push({ card, type, prompt, options: [shown], isTrue, answerWith });
    } else {
      questions.push({ card, type, prompt, answerWith });
    }
  });

  return shuffle(questions);
}

/* ── hook ── */

export function useBlockBuilderGame(cards: Card[]) {
  const [config, setConfig] = useState<BlockBuilderConfig>({
    answerDirection: 'term-to-definition',
    questionTypes: { written: true, multiple: true, truefalse: true },
    questionCount: Math.min(20, cards.length) || 10,
    difficulty: 'easy',
    infinityMode: false,
  });

  const [gameState, setGameState] = useState<GameState>({
    phase: 'config',
    blocks: INITIAL_BLOCKS,
    score: 0,
    lavaHeight: 0,
    currentQuestionIndex: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    streak: 0,
    maxBlocks: INITIAL_BLOCKS,
    startTime: 0,
    lastAnswerCorrect: null,
    questionStartTime: 0,
  });

  const [questions, setQuestions] = useState<BlockBuilderQuestion[]>([]);
  const lavaRef = useRef(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const lastTickRef = useRef(0);
  const gameActiveRef = useRef(false);

  /* keep a ref so the RAF can read the latest blocks */
  const blocksRef = useRef(INITIAL_BLOCKS);
  useEffect(() => { blocksRef.current = gameState.blocks; }, [gameState.blocks]);

  /* lava animation loop */
  const tick = useCallback(() => {
    if (!gameActiveRef.current) return;
    const now = performance.now();
    const elapsed = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;

    const gameTime = (now - startTimeRef.current) / 1000;
    const speeds = DIFFICULTY_SPEEDS[config.difficulty];
    const speed = speeds.base + speeds.accel * gameTime;
    lavaRef.current += speed * elapsed;

    const towerTop = blocksRef.current * BLOCK_HEIGHT_PX;
    if (lavaRef.current >= towerTop && towerTop > 0) {
      gameActiveRef.current = false;
      cancelAnimationFrame(rafRef.current);
      setGameState((s) => ({ ...s, phase: 'lost', lavaHeight: lavaRef.current }));
      return;
    }

    // sync to state at ~30fps (every ~33ms)
    setGameState((s) => ({ ...s, lavaHeight: lavaRef.current }));
    rafRef.current = requestAnimationFrame(tick);
  }, [config.difficulty]);

  /* start game */
  const startGame = useCallback(() => {
    const q = generateQuestions(cards, config);
    setQuestions(q);
    lavaRef.current = 0;
    startTimeRef.current = performance.now();
    lastTickRef.current = performance.now();
    gameActiveRef.current = true;

    setGameState({
      phase: 'playing',
      blocks: INITIAL_BLOCKS,
      score: 0,
      lavaHeight: 0,
      currentQuestionIndex: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      streak: 0,
      maxBlocks: INITIAL_BLOCKS,
      startTime: Date.now(),
      lastAnswerCorrect: null,
      questionStartTime: Date.now(),
    });

    rafRef.current = requestAnimationFrame(tick);
  }, [cards, config, tick]);

  /* cleanup */
  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* generate more questions for infinity mode */
  const ensureQuestions = useCallback(() => {
    if (!config.infinityMode) return;
    setQuestions((prev) => {
      // if we have fewer than 5 questions remaining, generate more
      const remaining = prev.length - gameState.currentQuestionIndex;
      if (remaining > 5) return prev;
      const more = generateQuestions(cards, config);
      return [...prev, ...more];
    });
  }, [cards, config, gameState.currentQuestionIndex]);

  /* submit answer */
  const submitAnswer = useCallback(
    (isCorrect: boolean) => {
      if (gameState.phase !== 'playing') return;

      const timeTaken = (Date.now() - gameState.questionStartTime) / 1000;
      const diffMult = config.difficulty === 'easy' ? 1 : config.difficulty === 'medium' ? 1.5 : 2;
      const newStreak = isCorrect ? gameState.streak + 1 : 0;

      let scoreAdd = 0;
      if (isCorrect) {
        const base = 100;
        const speedBonus = Math.max(0, 50 * (1 - timeTaken / 15));
        const streakMult = Math.min(2, 1 + newStreak * 0.1);
        scoreAdd = Math.round((base + speedBonus) * diffMult * streakMult);
      }

      const penalty = isCorrect ? 0 : (config.infinityMode ? 1 : BLOCK_PENALTY[config.difficulty]);
      const newBlocks = Math.max(0, gameState.blocks + (isCorrect ? 1 : -penalty));
      const nextIndex = gameState.currentQuestionIndex + 1;
      const isLastQuestion = !config.infinityMode && nextIndex >= questions.length;

      setGameState((s) => {
        const updated: GameState = {
          ...s,
          blocks: newBlocks,
          score: s.score + scoreAdd,
          currentQuestionIndex: nextIndex,
          questionsAnswered: s.questionsAnswered + 1,
          correctAnswers: s.correctAnswers + (isCorrect ? 1 : 0),
          wrongAnswers: s.wrongAnswers + (isCorrect ? 0 : 1),
          streak: newStreak,
          maxBlocks: Math.max(s.maxBlocks, newBlocks),
          lastAnswerCorrect: isCorrect,
          questionStartTime: Date.now(),
        };

        if (isLastQuestion) {
          updated.phase = 'won';
          gameActiveRef.current = false;
          cancelAnimationFrame(rafRef.current);
        }

        return updated;
      });

      blocksRef.current = newBlocks;

      if (config.infinityMode) {
        ensureQuestions();
      }
    },
    [gameState, config, questions.length, ensureQuestions],
  );

  /* typed answer helpers */
  const submitWrittenAnswer = useCallback(
    (input: string) => {
      const q = questions[gameState.currentQuestionIndex];
      if (!q) return;
      const correct = q.answerWith === 'term' ? q.card.term : q.card.definition;
      const ok = gradeWrittenAnswer(input, getTextContent(correct));
      submitAnswer(ok);
    },
    [questions, gameState.currentQuestionIndex, submitAnswer],
  );

  const submitMultipleChoice = useCallback(
    (optionIndex: number) => {
      const q = questions[gameState.currentQuestionIndex];
      if (!q || q.type !== 'multiple') return;
      submitAnswer(optionIndex === q.correctOption);
    },
    [questions, gameState.currentQuestionIndex, submitAnswer],
  );

  const submitTrueFalse = useCallback(
    (value: boolean) => {
      const q = questions[gameState.currentQuestionIndex];
      if (!q || q.type !== 'truefalse') return;
      submitAnswer(value === q.isTrue);
    },
    [questions, gameState.currentQuestionIndex, submitAnswer],
  );

  const resetGame = useCallback(() => {
    gameActiveRef.current = false;
    cancelAnimationFrame(rafRef.current);
    lavaRef.current = 0;
    setGameState({
      phase: 'config',
      blocks: INITIAL_BLOCKS,
      score: 0,
      lavaHeight: 0,
      currentQuestionIndex: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      streak: 0,
      maxBlocks: INITIAL_BLOCKS,
      startTime: 0,
      lastAnswerCorrect: null,
      questionStartTime: 0,
    });
    setQuestions([]);
  }, []);

  const currentQuestion = questions[gameState.currentQuestionIndex] ?? null;

  return {
    config,
    setConfig,
    gameState,
    currentQuestion,
    questions,
    startGame,
    submitWrittenAnswer,
    submitMultipleChoice,
    submitTrueFalse,
    resetGame,
  };
}
