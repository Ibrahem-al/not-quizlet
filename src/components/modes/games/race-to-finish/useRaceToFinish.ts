import { useState, useCallback, useMemo } from 'react';
import { shuffle } from '../../../../lib/algorithms';
import { getTextContent, isImageOnly, hasTextContent } from '../../../../lib/contentHelpers';
import { buildEquivalenceGroups, getEquivalentAnswers, getWrongOptionPool, getCorrectAnswersNormSet, isDistinctAnswer, findCorrectOptionIndices, gradeWrittenAnswerMulti, buildMultiAnswerOptions } from '../../../../lib/equivalence';
import type { EquivalenceGroups } from '../../../../lib/equivalence';
import type { Card } from '../../../../types';
import type {
  RaceConfig,
  RaceQuestion,
  RaceGameState,
  Player,
  BoardCell,
  Shortcut,
  QuestionType,
} from './types';
import { PLAYER_THEMES } from './types';

/* ── board generation ── */

function generateBoard(cards: Card[], pathLength: number): BoardCell[] {
  const cells: BoardCell[] = [];
  for (let i = 0; i < pathLength; i++) {
    const card = cards[i % cards.length];
    // Alternate term/definition using writing logic
    const termImg = isImageOnly(card.term);
    const defImg = isImageOnly(card.definition);

    let content: string;
    let label: 'Term' | 'Definition';

    if (termImg && !defImg) {
      content = card.definition;
      label = 'Definition';
    } else if (defImg && !termImg) {
      content = card.term;
      label = 'Term';
    } else {
      // Both text or both images — alternate
      if (i % 2 === 0) {
        content = card.term;
        label = 'Term';
      } else {
        content = card.definition;
        label = 'Definition';
      }
    }

    cells.push({ index: i, content, label });
  }
  return cells;
}

function generateShortcuts(pathLength: number): Shortcut[] {
  if (pathLength < 15) return [];
  const shortcuts: Shortcut[] = [];
  const count = Math.max(2, Math.floor(pathLength / 10));
  const used = new Set<number>();

  for (let i = 0; i < count; i++) {
    let from: number;
    let to: number;
    let attempts = 0;
    do {
      from = Math.floor(Math.random() * (pathLength * 0.6)) + Math.floor(pathLength * 0.1);
      to = from + Math.floor(Math.random() * Math.min(8, pathLength * 0.2)) + 3;
      attempts++;
    } while ((used.has(from) || used.has(to) || to >= pathLength - 1) && attempts < 50);

    if (attempts < 50 && to < pathLength - 1) {
      used.add(from);
      used.add(to);
      shortcuts.push({ from, to });
    }
  }
  return shortcuts;
}

/* ── question generation ── */

function generateQuestion(
  cards: Card[],
  config: RaceConfig,
  groups: EquivalenceGroups,
): RaceQuestion {
  const types: QuestionType[] = [];
  if (config.questionTypes.written) types.push('written');
  if (config.questionTypes.multiple) types.push('multiple');
  if (config.questionTypes.truefalse) types.push('truefalse');
  if (types.length === 0) types.push('written');

  const card = cards[Math.floor(Math.random() * cards.length)];

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
    if (available.length === 0) available = ['multiple'];
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
    return { card, type, prompt, options, correctOption: correctOptionIndices[0] ?? 0, correctOptionIndices, equivalentAnswers, answerWith };
  } else if (type === 'truefalse') {
    const isTrue = Math.random() > 0.5;
    const answer = answerWith === 'term' ? card.term : card.definition;
    let shown: string;
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
        return { card, type, prompt, options: [shown], isTrue: true, equivalentAnswers, answerWith };
      }
    } else {
      shown = answer;
    }
    return { card, type, prompt, options: [shown], isTrue, equivalentAnswers, answerWith };
  } else {
    return { card, type, prompt, equivalentAnswers, answerWith };
  }
}

/* ── hook ── */

export function useRaceToFinish(cards: Card[]) {
  const groups = useMemo(() => buildEquivalenceGroups(cards), [cards]);
  const [config, setConfig] = useState<RaceConfig>({
    playerCount: 1,
    pathLength: 20,
    answerDirection: 'term-to-definition',
    questionTypes: { written: true, multiple: true, truefalse: true },
    multiAnswerMC: false,
  });

  const [gameState, setGameState] = useState<RaceGameState>({
    phase: 'config',
    players: [],
    currentPlayerIndex: 0,
    diceValue: 1,
    boardCells: [],
    shortcuts: [],
    winner: null,
    questionsAnswered: 0,
    correctAnswers: 0,
    layoutSeed: 0,
    pendingMove: null,
  });

  const [currentQuestion, setCurrentQuestion] = useState<RaceQuestion | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  /* start game */
  const startGame = useCallback(() => {
    const players: Player[] = [];
    for (let i = 0; i < config.playerCount; i++) {
      const theme = PLAYER_THEMES[i % PLAYER_THEMES.length];
      players.push({
        id: i,
        name: config.playerCount === 1 ? 'You' : `Player ${i + 1}`,
        position: -1, // before start
        ...theme,
      });
    }

    const boardCells = generateBoard(cards, config.pathLength);
    const shortcuts = generateShortcuts(config.pathLength);

    // Mark shortcut cells
    shortcuts.forEach((s) => {
      if (boardCells[s.from]) boardCells[s.from].shortcutTo = s.to;
    });

    const q = generateQuestion(cards, config, groups);
    setCurrentQuestion(q);
    setLastAnswerCorrect(null);

    setGameState({
      phase: 'question',
      players,
      currentPlayerIndex: 0,
      diceValue: 1,
      boardCells,
      shortcuts,
      winner: null,
      questionsAnswered: 0,
      correctAnswers: 0,
      layoutSeed: Date.now(),
      pendingMove: null,
    });
  }, [cards, config, groups]);

  /* answer submitted — check correctness */
  const handleAnswerResult = useCallback(
    (isCorrect: boolean) => {
      setLastAnswerCorrect(isCorrect);
      setGameState((s) => ({
        ...s,
        questionsAnswered: s.questionsAnswered + 1,
        correctAnswers: s.correctAnswers + (isCorrect ? 1 : 0),
      }));

      if (isCorrect) {
        // Move to dice rolling phase
        setGameState((s) => ({ ...s, phase: 'rolling' }));
      } else {
        // Skip turn — move to next player after brief delay
        setTimeout(() => {
          setGameState((s) => {
            const nextPlayer = (s.currentPlayerIndex + 1) % s.players.length;
            return { ...s, currentPlayerIndex: nextPlayer, phase: 'question' };
          });
          const q = generateQuestion(cards, config, groups);
          setCurrentQuestion(q);
          setLastAnswerCorrect(null);
        }, 1500);
      }
    },
    [cards, config, groups],
  );

  const submitWrittenAnswer = useCallback(
    (input: string) => {
      if (!currentQuestion) return;
      const answers = currentQuestion.equivalentAnswers ?? [getTextContent(
        currentQuestion.answerWith === 'term' ? currentQuestion.card.term : currentQuestion.card.definition
      )];
      const ok = gradeWrittenAnswerMulti(answers, input);
      handleAnswerResult(ok);
    },
    [currentQuestion, handleAnswerResult],
  );

  const submitMultipleChoice = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion || currentQuestion.type !== 'multiple') return;
      const indices = currentQuestion.correctOptionIndices ?? (currentQuestion.correctOption !== undefined ? [currentQuestion.correctOption] : []);
      handleAnswerResult(indices.includes(optionIndex));
    },
    [currentQuestion, handleAnswerResult],
  );

  const submitTrueFalse = useCallback(
    (value: boolean) => {
      if (!currentQuestion || currentQuestion.type !== 'truefalse') return;
      handleAnswerResult(value === currentQuestion.isTrue);
    },
    [currentQuestion, handleAnswerResult],
  );

  /* dice roll complete — set up pending move but do NOT update position yet */
  const onDiceRollComplete = useCallback(
    (value: number) => {
      setGameState((s) => {
        const player = s.players[s.currentPlayerIndex];
        const fromPos = player.position;
        let toPos = fromPos + value;

        // Cap at last cell
        if (toPos >= config.pathLength - 1) {
          toPos = config.pathLength - 1;
        }

        // Check for shortcut at landing cell
        const cell = s.boardCells[toPos];
        const shortcutTo = cell?.shortcutTo;

        return {
          ...s,
          phase: 'moving',
          diceValue: value,
          pendingMove: {
            playerId: player.id,
            fromPos,
            toPos,
            shortcutTo,
            steps: value,
          },
        };
      });
    },
    [config.pathLength],
  );

  /* movement animation complete — apply the final position */
  const onMoveComplete = useCallback(() => {
    setGameState((s) => {
      if (!s.pendingMove) return s;

      const finalPos = s.pendingMove.shortcutTo ?? s.pendingMove.toPos;
      const player = s.players.find((p) => p.id === s.pendingMove!.playerId)!;

      const updatedPlayers = s.players.map((p) =>
        p.id === s.pendingMove!.playerId ? { ...p, position: finalPos } : p,
      );

      const hasWon = finalPos >= config.pathLength - 1;

      if (hasWon) {
        return {
          ...s,
          phase: 'finished',
          players: updatedPlayers,
          winner: { ...player, position: finalPos },
          pendingMove: null,
        };
      }

      const nextPlayer = (s.currentPlayerIndex + 1) % s.players.length;
      return {
        ...s,
        currentPlayerIndex: nextPlayer,
        phase: 'question',
        players: updatedPlayers,
        pendingMove: null,
      };
    });

    // Generate next question
    setTimeout(() => {
      setGameState((s) => {
        if (s.phase === 'finished') return s;
        const q = generateQuestion(cards, config, groups);
        setCurrentQuestion(q);
        setLastAnswerCorrect(null);
        return s;
      });
    }, 300);
  }, [cards, config, groups]);

  /* reset */
  const resetGame = useCallback(() => {
    setGameState({
      phase: 'config',
      players: [],
      currentPlayerIndex: 0,
      diceValue: 1,
      boardCells: [],
      shortcuts: [],
      winner: null,
      questionsAnswered: 0,
      correctAnswers: 0,
      layoutSeed: 0,
      pendingMove: null,
    });
    setCurrentQuestion(null);
    setLastAnswerCorrect(null);
  }, []);

  return {
    config,
    setConfig,
    gameState,
    currentQuestion,
    lastAnswerCorrect,
    startGame,
    submitWrittenAnswer,
    submitMultipleChoice,
    submitTrueFalse,
    onDiceRollComplete,
    onMoveComplete,
    resetGame,
  };
}
