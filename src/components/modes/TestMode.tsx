import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { Button } from '../ui';
import { Input } from '../ui';
import { shuffle, gradeWrittenAnswer } from '../../lib/algorithms';
import { useTranslation } from '../../hooks/useTranslation';
import type { Card } from '../../types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

type TestQuestionType = 'written' | 'multiple' | 'matching' | 'truefalse';
type AnswerDirection = 'term-to-definition' | 'definition-to-term';

interface TestConfig {
  written: boolean;
  multiple: boolean;
  matching: boolean;
  truefalse: boolean;
  questionCount: number;
  answerDirection: AnswerDirection;
}

interface TestQuestion {
  card: Card;
  type: TestQuestionType;
  options?: string[];
  correctOption?: number;
  isTrue?: boolean;
  answerWith: 'term' | 'definition';
}

interface TestModeProps {
  cards: Card[];
  setTitle: string;
  onExit: () => void;
  onStudyMissed?: (missedCardIds: string[]) => void;
}

/**
 * Check if a string contains only an image (no meaningful text content).
 */
function isImageOnly(content: string): boolean {
  if (!content) return false;
  // Remove img tags and check if there's any text left
  const withoutImages = content.replace(/<img[^>]*>/gi, '');
  const textContent = withoutImages.replace(/<[^>]*>/g, '').trim();
  return textContent === '' && content.includes('<img');
}

/**
 * Get the text content for grading (remove HTML tags).
 */
function getTextContent(content: string): string {
  return content.replace(/<[^>]*>/g, '').trim();
}

/**
 * Check if a card has any text content suitable for written answers.
 */
function hasTextContent(content: string): boolean {
  const textContent = content.replace(/<[^>]*>/g, '').trim();
  return textContent.length > 0;
}

function generateQuestions(cards: Card[], config: TestConfig): TestQuestion[] {
  const types: TestQuestionType[] = [];
  if (config.written) types.push('written');
  if (config.multiple) types.push('multiple');
  if (config.matching) types.push('matching');
  if (config.truefalse) types.push('truefalse');

  if (types.length === 0) types.push('written');

  const questions: TestQuestion[] = [];
  const selectedCards = shuffle(cards).slice(0, config.questionCount);

  selectedCards.forEach((card) => {
    // Check what content each side has
    const isTermImageOnly = isImageOnly(card.term);
    const isDefImageOnly = isImageOnly(card.definition);
    const termHasText = hasTextContent(card.term);
    const defHasText = hasTextContent(card.definition);

    // Determine answer direction based on content
    let answerWith: 'term' | 'definition';
    let questionFrom: 'term' | 'definition';

    // Smart logic for handling pictures vs text
    if (isTermImageOnly && isDefImageOnly) {
      // Both sides are pictures only - skip written questions
      answerWith = config.answerDirection === 'term-to-definition' ? 'definition' : 'term';
      questionFrom = config.answerDirection === 'term-to-definition' ? 'term' : 'definition';
    } else if (isTermImageOnly && defHasText) {
      // Term is picture-only, definition has text -> force show term pic, write definition
      answerWith = 'definition';
      questionFrom = 'term';
    } else if (isDefImageOnly && termHasText) {
      // Definition is picture-only, term has text -> force show definition pic, write term
      answerWith = 'term';
      questionFrom = 'definition';
    } else {
      // Both have text (may also have pictures) -> use user's preference
      answerWith = config.answerDirection === 'term-to-definition' ? 'definition' : 'term';
      questionFrom = config.answerDirection === 'term-to-definition' ? 'term' : 'definition';
    }

    // For written questions: skip if both sides are image-only
    let availableTypes = types;
    if (isTermImageOnly && isDefImageOnly) {
      availableTypes = types.filter(t => t !== 'written');
      if (availableTypes.length === 0) return; // Skip this card entirely if no valid question types
    }

    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

    if (type === 'multiple') {
      const others = cards.filter((c) => c.id !== card.id);
      // Use the same side for wrong answers as the answer side
      const wrong = shuffle(others).slice(0, 3).map((c) => 
        answerWith === 'term' ? c.term : c.definition
      );
      const correct = answerWith === 'term' ? card.term : card.definition;
      const options = shuffle([correct, ...wrong]);
      questions.push({
        card,
        type,
        options,
        correctOption: options.indexOf(correct),
        answerWith,
      });
    } else if (type === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      let shownContent: string;
      const answerContent = answerWith === 'term' ? card.term : card.definition;
      
      if (isTrue) {
        shownContent = answerContent;
      } else if (cards.length > 1) {
        const other = shuffle(cards.filter((c) => c.id !== card.id))[0];
        shownContent = answerWith === 'term' ? other.term : other.definition;
      } else {
        shownContent = answerContent;
      }
      questions.push({ 
        card, 
        type, 
        options: [shownContent], 
        isTrue,
        answerWith,
      });
    } else {
      questions.push({ card, type, answerWith });
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
  const { t } = useTranslation();
  const [config, setConfig] = useState<TestConfig>({
    written: true,
    multiple: true,
    matching: false,
    truefalse: true,
    questionCount: Math.min(20, cards.length) || 10,
    answerDirection: 'term-to-definition',
  });
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, boolean>>(new Map());
  const [writtenInput, setWrittenInput] = useState('');
  const [showResults, setShowResults] = useState(false);

  const total = questions.length;
  const current = questions[index];
  const correctCount = Array.from(answers.values()).filter(Boolean).length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const startTest = useCallback(() => {
    const generated = generateQuestions(cards, config);
    setQuestions(generated);
    setStarted(true);
    setIndex(0);
    setAnswers(new Map());
    setShowResults(false);
  }, [cards, config]);

  const submitWritten = useCallback(() => {
    if (!current) return;
    // Grade based on what the user should answer with
    const correctContent = current.answerWith === 'term' 
      ? current.card.term 
      : current.card.definition;
    const ok = gradeWrittenAnswer(writtenInput, getTextContent(correctContent));
    setAnswers((prev) => new Map(prev).set(index, ok));
    setWrittenInput('');
    if (index < total - 1) setIndex((i) => i + 1);
    else setShowResults(true);
  }, [current, writtenInput, index, total]);

  const submitMultiple = useCallback(
    (optionIndex: number) => {
      if (!current || current.type !== 'multiple') return;
      const ok = optionIndex === current.correctOption;
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

  const missedCards = useMemo(() => {
    return questions
      .map((q, i) => ({ card: q.card, correct: answers.get(i) }))
      .filter((x) => !x.correct)
      .map((x) => x.card);
  }, [questions, answers]);

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
        // Strip HTML tags for PDF export
        const termText = card.term.replace(/<[^>]*>/g, '');
        const defText = card.definition.replace(/<[^>]*>/g, '');
        doc.text(`Term: ${termText}`, 20, y);
        y += 6;
        doc.text(`Definition: ${defText}`, 20, y);
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
                  <div className="space-y-1 study-content">
                    <div dangerouslySetInnerHTML={{ __html: card.term }} />
                    <div className="text-[var(--color-text-secondary)]" dangerouslySetInnerHTML={{ __html: card.definition }} />
                  </div>
                </li>
              ))}
            </ul>
            {onStudyMissed && (
              <Button
                onClick={() => onStudyMissed(missedCards.map((c) => c.id))}
                className="w-full"
              >
                Study Missed Cards
              </Button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={exportPdf} variant="secondary" className="flex-1">
            Export PDF
          </Button>
          <Button onClick={onExit} className="flex-1">
            Exit
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Test Configuration</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text)]">
              Answer with
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, answerDirection: 'term-to-definition' }))}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                  config.answerDirection === 'term-to-definition'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-primary-muted)]'
                }`}
              >
                Definition
              </button>
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, answerDirection: 'definition-to-term' }))}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                  config.answerDirection === 'definition-to-term'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-primary-muted)]'
                }`}
              >
                Term
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Choose whether to answer with the term or definition
            </p>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.written}
              onChange={(e) => setConfig((c) => ({ ...c, written: e.target.checked }))}
            />
            <span className="text-[var(--color-text)]">Written answers</span>
          </label>
          <p className="text-xs text-[var(--color-text-secondary)] ml-6">
            Note: If one side is a picture and the other has text, you'll type the text. Cards with only pictures are skipped.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.multiple}
              onChange={(e) => setConfig((c) => ({ ...c, multiple: e.target.checked }))}
            />
            <span className="text-[var(--color-text)]">Multiple choice</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.truefalse}
              onChange={(e) => setConfig((c) => ({ ...c, truefalse: e.target.checked }))}
            />
            <span className="text-[var(--color-text)]">True / False</span>
          </label>
          <div className="pt-2">
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Question count: {config.questionCount}
            </label>
            <input
              type="range"
              min={5}
              max={Math.min(cards.length, 50)}
              value={config.questionCount}
              onChange={(e) =>
                setConfig((c) => ({ ...c, questionCount: parseInt(e.target.value, 10) }))
              }
              className="w-full"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={startTest} className="flex-1">
            Start Test
          </Button>
          <Button onClick={onExit} variant="ghost">
            Exit
          </Button>
        </div>
      </div>
    );
  }

  // Get the content to show as the question prompt
  const questionPrompt = current 
    ? (current.answerWith === 'definition' ? current.card.term : current.card.definition)
    : '';

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
            {/* Show prompt at top for multiple choice only (written and truefalse have their own layouts) */}
            {current.type === 'multiple' && (
              <div
                className="text-lg font-medium text-[var(--color-text)] study-content"
                dangerouslySetInnerHTML={{ __html: questionPrompt }}
              />
            )}

            {current.type === 'written' && (
              <div className="space-y-4">
                {/* Show what the user is answering based on */}
                <div className="p-4 rounded-lg bg-[var(--color-primary-muted)]/30 border border-[var(--color-border)]">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                    {current.answerWith === 'definition' ? 'Term' : 'Definition'}
                  </p>
                  <div 
                    className="text-lg font-medium text-[var(--color-text)] study-content"
                    dangerouslySetInnerHTML={{ __html: questionPrompt }}
                  />
                </div>
                
                {/* Input area */}
                <div className="space-y-2">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Type the {current.answerWith}:
                  </p>
                  <Input
                    placeholder={`Enter the ${current.answerWith}...`}
                    value={writtenInput}
                    onChange={(e) => setWrittenInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitWritten()}
                  />
                  <Button onClick={submitWritten}>Submit</Button>
                </div>
              </div>
            )}

            {current.type === 'multiple' && current.options && (
              <div className="flex flex-col gap-2">
                {current.options.map((opt, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    className="justify-start text-left h-auto min-h-[44px] py-2"
                    onClick={() => submitMultiple(i)}
                  >
                    <span className="study-content" dangerouslySetInnerHTML={{ __html: opt }} />
                  </Button>
                ))}
              </div>
            )}

            {current.type === 'truefalse' && current.options && (
              <div className="space-y-6">
                {/* True/False Question Layout */}
                <div className="space-y-4">
                  {/* Card 1: The question prompt (what user is matching FROM) */}
                  <div className="p-4 rounded-lg bg-[var(--color-primary-muted)]/30 border border-[var(--color-border)]">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                      {current.answerWith === 'definition' ? 'Term' : 'Definition'}
                    </p>
                    <div 
                      className="text-lg font-medium text-[var(--color-text)] study-content"
                      dangerouslySetInnerHTML={{ 
                        __html: current.answerWith === 'definition' 
                          ? current.card.term 
                          : current.card.definition 
                      }} 
                    />
                  </div>
                  
                  {/* Card 2: The proposed match (what user is evaluating) */}
                  <div className="p-4 rounded-lg bg-[var(--color-background)] border-2 border-dashed border-[var(--color-border)]">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                      Proposed {current.answerWith === 'definition' ? 'Definition' : 'Term'}
                    </p>
                    <div 
                      className="text-base text-[var(--color-text)] study-content"
                      dangerouslySetInnerHTML={{ 
                        __html: current.options[0] 
                      }} 
                    />
                  </div>
                </div>

                {/* Question */}
                <div className="text-center">
                  <p className="text-base font-medium text-[var(--color-text)]">
                    Is this the correct {current.answerWith === 'definition' ? 'definition' : 'term'} for the {current.answerWith === 'definition' ? 'term' : 'definition'} above?
                  </p>
                </div>

                {/* True/False Buttons */}
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => submitTrueFalse(true)}
                    variant="secondary"
                    className="min-w-[100px] bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/30"
                  >
                    {t('true')}
                  </Button>
                  <Button 
                    onClick={() => submitTrueFalse(false)}
                    variant="secondary"
                    className="min-w-[100px] bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/30"
                  >
                    {t('false')}
                  </Button>
                </div>
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
