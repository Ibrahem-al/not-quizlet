import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui';
import { Input } from '../ui';
import { useSpacedRep } from '../../hooks/useSpacedRep';
import { shuffle, gradeWrittenAnswer } from '../../lib/algorithms';
import { useTranslation } from '../../hooks/useTranslation';
import type { Card } from '../../types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

type QuestionType = 'multiple' | 'written' | 'truefalse';

interface LearnModeProps {
  cards: Card[];
  setId: string;
  onExit: () => void;
}

interface SessionCard {
  card: Card;
  questionType: QuestionType;
  options?: string[]; // for MC: [correct, wrong1, wrong2, wrong3]
  correctOption?: number;
  isTrue?: boolean; // for T/F: term+definition is correct pair
}

function buildSession(cards: Card[], maxCards = 20): SessionCard[] {
  const shuffled = shuffle(cards).slice(0, maxCards);
  return shuffled.map((card) => {
    const r = Math.random();
    let questionType: QuestionType;
    if (r < 0.4) questionType = 'multiple';
    else if (r < 0.8) questionType = 'written';
    else questionType = 'truefalse';

    if (questionType === 'multiple') {
      const others = cards.filter((c) => c.id !== card.id);
      const wrong = shuffle(others)
        .slice(0, 3)
        .map((c) => c.definition);
      const options = shuffle([card.definition, ...wrong]);
      const correctOption = options.indexOf(card.definition);
      return { card, questionType, options, correctOption };
    }

    if (questionType === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      let definition = card.definition;
      if (!isTrue && cards.length > 1) {
        const other = shuffle(cards.filter((c) => c.id !== card.id))[0];
        definition = other?.definition ?? card.definition;
      }
      return { card, questionType, options: [definition], isTrue };
    }

    return { card, questionType };
  });
}

export function LearnMode({ cards, setId, onExit }: LearnModeProps) {
  const { t } = useTranslation();
  const sessionCards = useMemo(
    () => buildSession(cards, 20),
    [cards]
  );
  const [index, setIndex] = useState(0);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const { recordReview } = useSpacedRep(setId);

  const current = sessionCards[index];
  const progress = sessionCards.length ? t('progress', { current: index + 1, total: sessionCards.length }) : '0 / 0';

  const submitWritten = useCallback(() => {
    if (!current || current.questionType !== 'written') return;
    const ok = gradeWrittenAnswer(current.card.definition, writtenAnswer);
    setCorrect(ok);
    setAnswered(true);
  }, [current, writtenAnswer]);

  const submitMultiple = useCallback((choiceIndex: number) => {
    if (!current || current.questionType !== 'multiple' || current.correctOption === undefined) return;
    const ok = choiceIndex === current.correctOption;
    setCorrect(ok);
    setAnswered(true);
  }, [current]);

  const submitTrueFalse = useCallback((value: boolean) => {
    if (!current || current.questionType !== 'truefalse') return;
    const ok = value === current.isTrue;
    setCorrect(ok);
    setAnswered(true);
  }, [current]);

  const pickConfidence = useCallback(
    async (quality: number) => {
      if (!current) return;
      const timeSpent = 0; // could track per question
      await recordReview(current.card, correct ? quality : Math.min(quality, 2), timeSpent, 'learn');
      setAnswered(false);
      setCorrect(false);
      setWrittenAnswer('');
      if (index < sessionCards.length - 1) setIndex((i) => i + 1);
      else setSessionComplete(true);
    },
    [current, correct, index, sessionCards.length, recordReview]
  );

  // Skip rating and default to medium (quality 4)
  const skipRating = useCallback(async () => {
    if (!current) return;
    const timeSpent = 0;
    await recordReview(current.card, 4, timeSpent, 'learn');
    setAnswered(false);
    setCorrect(false);
    setWrittenAnswer('');
    if (index < sessionCards.length - 1) setIndex((i) => i + 1);
    else setSessionComplete(true);
  }, [current, index, sessionCards.length, recordReview]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && current?.questionType === 'written' && !answered) {
        submitWritten();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, answered, submitWritten]);

  if (sessionCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-[var(--color-text-secondary)]">{t('noCardsToLearn')}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('addCardsFirst')}</p>
        <Button onClick={onExit}>{t('back')}</Button>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="text-xl font-bold text-[var(--color-text)]">{t('sessionComplete')}</h2>
        <p className="text-[var(--color-text-secondary)]">
          {t('cardsStudied', { count: sessionCards.length })}
        </p>
        <Button onClick={onExit}>{t('back')}</Button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto bg-[var(--color-background)]">
      <header className="p-4 sm:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] flex justify-between items-center">
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {progress}
        </span>
        <Button variant="ghost" onClick={onExit} aria-label={t('exit')}>
          {t('exit')}
        </Button>
      </header>

      <main className="flex-1 p-6">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.card.id + index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={spring}
              className="space-y-6"
            >
              <div
                className="text-lg font-medium text-[var(--color-text)]"
                dangerouslySetInnerHTML={{ __html: current.card.term }}
              />

              {current.questionType === 'written' && (
                <div className="space-y-2">
                  <Input
                    placeholder={t('typeDefinition')}
                    value={writtenAnswer}
                    onChange={(e) => setWrittenAnswer(e.target.value)}
                    disabled={answered}
                    onKeyDown={(e) => e.key === 'Enter' && submitWritten()}
                  />
                  {!answered && (
                    <Button onClick={submitWritten}>{t('check')}</Button>
                  )}
                </div>
              )}

              {current.questionType === 'multiple' && current.options && (
                <div className="flex flex-col gap-2">
                  {current.options.map((opt, i) => (
                    <motion.div key={i} whileTap={{ scale: 0.98 }} transition={spring}>
                      <Button
                        variant="secondary"
                        className="w-full justify-start text-left h-auto min-h-[44px] py-2"
                        onClick={() => submitMultiple(i)}
                        disabled={answered}
                      >
                        <span dangerouslySetInnerHTML={{ __html: opt }} />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}

              {current.questionType === 'truefalse' && current.options && (
                <div className="space-y-3">
                  <div className="text-[var(--color-text-secondary)]">
                    {t('definition')}: <span dangerouslySetInnerHTML={{ __html: current.options[0] }} />
                  </div>
                  <p className="text-sm text-[var(--color-text)]">{t('isThisCorrect')}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => submitTrueFalse(true)}
                      disabled={answered}
                    >
                      {t('true')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => submitTrueFalse(false)}
                      disabled={answered}
                    >
                      {t('false')}
                    </Button>
                  </div>
                </div>
              )}

              {answered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-lg ${correct ? 'bg-[var(--color-success)]/20' : 'bg-[var(--color-danger)]/20'}`}
                >
                  <div className="text-sm text-[var(--color-text)]">
                    {correct ? t('correct') : (
                      <span dangerouslySetInnerHTML={{ __html: `${t('correctAnswer', { answer: '' })} ${current.card.definition}` }} />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Show confidence rating only when answered correctly */}
              {answered && correct && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 flex-wrap"
                >
                  <span className="text-sm text-[var(--color-text-secondary)] w-full">
                    {t('howWellDidYouKnow')}
                  </span>
                  <motion.div whileTap={{ scale: 0.95 }} transition={spring}>
                    <Button
                      variant="secondary"
                      onClick={() => pickConfidence(5)}
                    >
                      {t('easy')}
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }} transition={spring}>
                    <Button
                      variant="secondary"
                      onClick={() => pickConfidence(4)}
                    >
                      {t('medium')}
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }} transition={spring}>
                    <Button
                      variant="secondary"
                      onClick={() => pickConfidence(3)}
                    >
                      {t('hard')}
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }} transition={spring}>
                    <Button variant="ghost" onClick={skipRating}>
                      {t('next')}
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {/* Show Next button only when answered incorrectly */}
              {answered && !correct && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <motion.div whileTap={{ scale: 0.95 }} transition={spring}>
                    <Button onClick={skipRating}>{t('next')}</Button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
