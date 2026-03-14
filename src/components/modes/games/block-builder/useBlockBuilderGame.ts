import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { shuffle } from '../../../../lib/algorithms';
import { getTextContent, isImageOnly, hasTextContent, selectCardsForQuestions } from '../../../../lib/contentHelpers';
import { buildEquivalenceGroups, getEquivalentAnswers, getWrongOptionPool, getCorrectAnswersNormSet, isDistinctAnswer, findCorrectOptionIndices, gradeWrittenAnswerMulti, buildMultiAnswerOptions } from '../../../../lib/equivalence';
import type { EquivalenceGroups } from '../../../../lib/equivalence';
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

/* ── question generation ── */

function generateQuestions(
  cards: Card[],
  config: BlockBuilderConfig,
  groups: EquivalenceGroups,
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
    const equivalentAnswers = getEquivalentAnswers(card, answerWith, groups);

    if (type === 'multiple') {
      let options: string[];
      if (config.multiAnswerMC) {
        options = buildMultiAnswerOptions(card, cards, answerWith, groups);
      } else {
        const wrongPool = getWrongOptionPool(card, cards, answerWith, groups);
        const wrong = shuffle(wrongPool)
          .slice(0, 3)
          .map((c) => (answerWith === 'term' ? c.term : c.definition));
        const correct = answerWith === 'term' ? card.term : card.definition;
        options = shuffle([correct, ...wrong]);
      }
      const correctOptionIndices = findCorrectOptionIndices(options, card, answerWith, groups);
      questions.push({ card, type, prompt, options, correctOption: correctOptionIndices[0] ?? 0, correctOptionIndices, equivalentAnswers, answerWith });
    } else if (type === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      let shown: string;
      const answer = answerWith === 'term' ? card.term : card.definition;
      if (isTrue) {
        shown = answer;
      } else if (cards.length > 1) {
        const correctNorm = getCorrectAnswersNormSet(card, answerWith, groups);
        const distinctOthers = cards.filter((c) => {
          const content = answerWith === 'term' ? c.term : c.definition;
          return isDistinctAnswer(content, correctNorm);
        });
        if (distinctOthers.length > 0) {
          const other = shuffle(distinctOthers)[0];
          shown = answerWith === 'term' ? other.term : other.definition;
        } else {
          shown = answer;
          questions.push({ card, type, prompt, options: [shown], isTrue: true, equivalentAnswers, answerWith });
          return;
        }
      } else {
        shown = answer;
      }
      questions.push({ card, type, prompt, options: [shown], isTrue, equivalentAnswers, answerWith });
    } else {
      questions.push({ card, type, prompt, equivalentAnswers, answerWith });
    }
  });

  return shuffle(questions);
}

/* ── hook ── */

export function useBlockBuilderGame(cards: Card[]) {
  const groups = useMemo(() => buildEquivalenceGroups(cards), [cards]);
  const [config, setConfig] = useState<BlockBuilderConfig>({
    answerDirection: 'term-to-definition',
    questionTypes: { written: true, multiple: true, truefalse: true },
    questionCount: Math.min(20, cards.length) || 10,
    difficulty: 'easy',
    infinityMode: false,
    multiAnswerMC: false,
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
    const q = generateQuestions(cards, config, groups);
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
  }, [cards, config, groups, tick]);

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
      const more = generateQuestions(cards, config, groups);
      return [...prev, ...more];
    });
  }, [cards, config, groups, gameState.currentQuestionIndex]);

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
      const answers = q.equivalentAnswers ?? [getTextContent(
        q.answerWith === 'term' ? q.card.term : q.card.definition
      )];
      const ok = gradeWrittenAnswerMulti(answers, input);
      submitAnswer(ok);
    },
    [questions, gameState.currentQuestionIndex, submitAnswer],
  );

  const submitMultipleChoice = useCallback(
    (optionIndex: number) => {
      const q = questions[gameState.currentQuestionIndex];
      if (!q || q.type !== 'multiple') return;
      const indices = q.correctOptionIndices ?? (q.correctOption !== undefined ? [q.correctOption] : []);
      submitAnswer(indices.includes(optionIndex));
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
