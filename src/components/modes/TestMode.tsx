import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { Button } from '../ui';
import { Input } from '../ui';
import { shuffle, gradeWrittenAnswer } from '../../lib/algorithms';
import type { Card } from '../../types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

type TestQuestionType = 'written' | 'multiple' | 'matching' | 'truefalse';

interface TestConfig {
  written: boolean;
  multiple: boolean;
  matching: boolean;
  truefalse: boolean;
  questionCount: number;
}

interface TestQuestion {
  card: Card;
  type: TestQuestionType;
  options?: string[];
  correctOption?: number;
  isTrue?: boolean;
}

interface TestModeProps {
  cards: Card[];
  setTitle: string;
  onExit: () => void;
  onStudyMissed?: (cardIds: string[]) => void;
}

function buildTestQuestions(
  cards: Card[],
  config: TestConfig
): TestQuestion[] {
  if (cards.length === 0) return [];
  const types: TestQuestionType[] = [];
  if (config.written) types.push('written');
  if (config.multiple) types.push('multiple');
  if (config.matching) types.push('matching');
  if (config.truefalse) types.push('truefalse');
  if (types.length === 0) types.push('written', 'multiple');

  const count = Math.min(config.questionCount || cards.length, cards.length);
  const shuffled = shuffle(cards).slice(0, count);
  const questions: TestQuestion[] = [];

  shuffled.forEach((card) => {
    const type = types[Math.floor(Math.random() * types.length)];
    if (type === 'multiple') {
      const others = cards.filter((c) => c.id !== card.id);
      const wrong = shuffle(others).slice(0, 3).map((c) => c.definition);
      const options = shuffle([card.definition, ...wrong]);
      questions.push({
        card,
        type,
        options,
        correctOption: options.indexOf(card.definition),
      });
    } else if (type === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      let def = card.definition;
      if (!isTrue && cards.length > 1) {
        const other = shuffle(cards.filter((c) => c.id !== card.id))[0];
        def = other?.definition ?? card.definition;
      }
      questions.push({ card, type, options: [def], isTrue });
    } else {
      questions.push({ card, type });
    }
  });

  return shuffle(questions);
}

export function TestMode({
  cards,
  setTitle,
  onExit,
  onStudyMissed,
}: TestModeProps) {
  const [config, setConfig] = useState<TestConfig>({
    written: true,
    multiple: true,
    matching: false,
    truefalse: true,
    questionCount: Math.min(20, cards.length) || 10,
  });
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, boolean>>(new Map());
  const [writtenInput, setWrittenInput] = useState('');
  const [showResults, setShowResults] = useState(false);

  const current = questions[index];
  const total = questions.length;
  const correctCount = Array.from(answers.values()).filter(Boolean).length;
  const missedCards = useMemo(() => {
    return questions
      .filter((_, i) => !answers.get(i))
      .map((q) => q.card);
  }, [questions, answers]);
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const startTest = useCallback(() => {
    const q = buildTestQuestions(cards, config);
    setQuestions(q);
    setIndex(0);
    setAnswers(new Map());
    setStarted(true);
    setShowResults(false);
  }, [cards, config]);

  const submitWritten = useCallback(() => {
    if (!current || current.type !== 'written') return;
    const ok = gradeWrittenAnswer(current.card.definition, writtenInput);
    setAnswers((prev) => new Map(prev).set(index, ok));
    setWrittenInput('');
    if (index < total - 1) setIndex((i) => i + 1);
    else setShowResults(true);
  }, [current, index, total, writtenInput]);

  const submitMultiple = useCallback(
    (choiceIndex: number) => {
      if (!current || current.type !== 'multiple' || current.correctOption === undefined) return;
      const ok = choiceIndex === current.correctOption;
      setAnswers((prev) => new Map(prev).set(index, ok));
      if (index < total - 1) setIndex((i) => i + 1);
      else setShowResults(true);
    },
    [current, index, total]
  );

  const submitTrueFalse = useCallback(
    (value: boolean) => {
      if (!current || current.type !== 'truefalse') return;
      const ok = value === current.isTrue;
      setAnswers((prev) => new Map(prev).set(index, ok));
      if (index < total - 1) setIndex((i) => i + 1);
      else setShowResults(true);
    },
    [current, index, total]
  );

  const exportPdf = useCallback(() => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(setTitle, 20, 20);
    doc.setFontSize(12);
    doc.text(`Test Results - ${new Date().toLocaleDateString()}`, 20, 28);
    doc.text(`Score: ${correctCount}/${total} (${accuracy}%)`, 20, 36);
    let y = 48;
    if (missedCards.length > 0) {
      doc.text('Missed:', 20, y);
      y += 8;
      missedCards.forEach((card) => {
        doc.setFontSize(10);
        doc.text(`Term: ${card.term.replace(/<[^>]*>/g, '')}`, 20, y);
        y += 6;
        doc.text(`Definition: ${card.definition}`, 20, y);
        y += 10;
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      });
    }
    doc.save(`studyflow-test-${setTitle.replace(/\s+/g, '-')}.pdf`);
  }, [setTitle, correctCount, total, accuracy, missedCards]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-[var(--color-text-secondary)]">No cards to test.</p>
        <p className="text-sm text-[var(--color-text-secondary)]">Add cards to this set first.</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }

  if (showResults) {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (accuracy / 100) * circumference;
    return (
      <motion.div
        className="max-w-lg mx-auto p-6 space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="text-xl font-bold text-[var(--color-text)]">Test Results</h2>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--color-text-secondary)"
                strokeWidth="8"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[var(--color-text)]">
              {accuracy}%
            </span>
          </div>
          <p className="text-[var(--color-text)]">
            {correctCount} / {total} correct
          </p>
        </div>
        {missedCards.length > 0 && (
          <div>
            <h3 className="font-semibold text-[var(--color-text)] mb-2">Missed cards</h3>
            <ul className="space-y-2 mb-4">
              {missedCards.map((card) => (
                <li
                  key={card.id}
                  className="p-2 rounded bg-[var(--color-text-secondary)]/10 text-sm"
                >
                  <strong>{card.term.replace(/<[^>]*>/g, '')}</strong> — {card.definition}
                </li>
              ))}
            </ul>
            {onStudyMissed && (
              <Button
                variant="secondary"
                onClick={() => onStudyMissed(missedCards.map((c) => c.id))}
              >
                Study These
              </Button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportPdf}>
            Export PDF
          </Button>
          <Button onClick={onExit}>Back to set</Button>
        </div>
      </motion.div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Test options</h2>
        <div className="space-y-2">
          {(['written', 'multiple', 'matching', 'truefalse'] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config[key]}
                onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.checked }))}
                className="rounded"
              />
              <span className="text-[var(--color-text)] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            </label>
          ))}
        </div>
        <Input
          label="Number of questions"
          type="number"
          min={1}
          max={cards.length}
          value={String(config.questionCount)}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n))
              setConfig((c) => ({
                ...c,
                questionCount: Math.min(cards.length, Math.max(1, n)),
              }));
          }}
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onExit}>
            Back
          </Button>
          <Button onClick={startTest}>Start test</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-2xl mx-auto p-6 sm:p-8">
      <header className="flex justify-between items-center mb-6">
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {index + 1} / {total}
        </span>
        <Button variant="ghost" onClick={onExit} aria-label="Exit">
          Exit
        </Button>
      </header>
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
            <p className="text-lg font-medium text-[var(--color-text)]">
              {current.card.term.replace(/<[^>]*>/g, '')}
            </p>

            {current.type === 'written' && (
              <div className="space-y-2">
                <Input
                  placeholder="Your answer..."
                  value={writtenInput}
                  onChange={(e) => setWrittenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitWritten()}
                />
                <Button onClick={submitWritten}>Submit</Button>
              </div>
            )}

            {current.type === 'multiple' && current.options && (
              <div className="flex flex-col gap-2">
                {current.options.map((opt, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    className="justify-start text-left"
                    onClick={() => submitMultiple(i)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            )}

            {current.type === 'truefalse' && current.options && (
              <div className="flex gap-2">
                <Button onClick={() => submitTrueFalse(true)}>True</Button>
                <Button onClick={() => submitTrueFalse(false)}>False</Button>
                <span className="self-center text-[var(--color-text-secondary)]">
                  &quot;{current.options[0]}&quot;
                </span>
              </div>
            )}

            {current.type === 'matching' && (
              <p className="text-[var(--color-text-secondary)]">
                Matching not implemented in test (use Match mode).
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
