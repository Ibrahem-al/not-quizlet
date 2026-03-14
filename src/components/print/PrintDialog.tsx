import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, FileText, LayoutGrid, Puzzle, Scissors, Loader2, Minus, Plus, ArrowLeft } from 'lucide-react';
import type { Card } from '../../types';
import type { PrintConfig, AnswerDirection } from '../../lib/printables';
import {
  generateLineMatchingPDF,
  generateTestPDF,
  generateFlashcardsPDF,
  generateMatchingGamePDF,
  generateCutAndGluePDF,
} from '../../lib/printables';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  setTitle: string;
}

const nonTestActivities = [
  {
    key: 'line-matching',
    label: 'Line Matching',
    description: 'Draw lines to match terms with definitions.',
    icon: ArrowLeftRight,
    color: 'from-blue-500 to-cyan-500',
    minCards: 2,
    generate: generateLineMatchingPDF,
  },
  {
    key: 'flashcards',
    label: 'Flashcards',
    description: 'Cut-out flashcards with term and definition.',
    icon: LayoutGrid,
    color: 'from-emerald-500 to-teal-500',
    minCards: 1,
    generate: generateFlashcardsPDF,
  },
  {
    key: 'matching-game',
    label: 'Matching Game',
    description: 'Cut-out cards for a physical matching game.',
    icon: Puzzle,
    color: 'from-orange-500 to-amber-500',
    minCards: 2,
    generate: generateMatchingGamePDF,
  },
  {
    key: 'cut-and-glue',
    label: 'Cut & Glue',
    description: 'Cut out terms and glue them next to definitions.',
    icon: Scissors,
    color: 'from-rose-500 to-red-400',
    minCards: 2,
    generate: generateCutAndGluePDF,
  },
] as const;

const directionOptions: { value: AnswerDirection; label: string }[] = [
  { value: 'term-to-definition', label: 'Definition' },
  { value: 'definition-to-term', label: 'Term' },
  { value: 'both', label: 'Both' },
];

function getDirectionHelp(dir: AnswerDirection): string {
  if (dir === 'term-to-definition') return 'Given the term, answer with the definition.';
  if (dir === 'definition-to-term') return 'Given the definition, answer with the term.';
  return 'Each item randomly picks which side is the prompt.';
}

export function PrintDialog({ isOpen, onClose, cards, setTitle }: PrintDialogProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [count, setCount] = useState(cards.length);
  const [direction, setDirection] = useState<AnswerDirection>('term-to-definition');

  // Test config sub-view
  const [showTestConfig, setShowTestConfig] = useState(false);
  const [testWritten, setTestWritten] = useState(true);
  const [testMultiple, setTestMultiple] = useState(true);
  const [testTrueFalse, setTestTrueFalse] = useState(true);
  const [testQuestionCount, setTestQuestionCount] = useState(Math.min(20, cards.length));
  const [testDirection, setTestDirection] = useState<AnswerDirection>('term-to-definition');

  const maxCount = cards.length;
  const maxTestQuestions = Math.max(cards.length * 3, 50);

  const handleCountChange = (val: number) => {
    setCount(Math.max(1, Math.min(val, maxCount)));
  };

  const handleCountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') { setCount(1); return; }
    handleCountChange(parseInt(raw, 10));
  };

  const handleTestCountChange = (val: number) => {
    setTestQuestionCount(Math.max(1, Math.min(val, maxTestQuestions)));
  };

  const handleTestCountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') { setTestQuestionCount(1); return; }
    handleTestCountChange(parseInt(raw, 10));
  };

  const presets = [...new Set([5, 10, 20, cards.length].filter(n => n >= 1 && n <= maxCount))];
  const testPresets = [5, 10, 20, cards.length, Math.min(cards.length * 2, maxTestQuestions)].filter(
    (v, i, a) => v >= 1 && v <= maxTestQuestions && a.indexOf(v) === i
  );

  const handleGenerate = async (activity: (typeof nonTestActivities)[number]) => {
    const config: PrintConfig = { count, direction };
    setGenerating(activity.key);
    try {
      await activity.generate(cards, setTitle, config);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateTest = async () => {
    const config: PrintConfig = {
      count: cards.length,
      direction: testDirection,
      testQuestionCount,
      testQuestionTypes: { written: testWritten, multiple: testMultiple, truefalse: testTrueFalse },
    };
    setGenerating('test');
    try {
      await generateTestPDF(cards, setTitle, config);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(null);
    }
  };

  const btnBase = 'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all';
  const btnActive = 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]';
  const btnInactive = 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]';

  const handleClose = () => {
    setShowTestConfig(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="bg-[var(--color-surface)] rounded-[var(--radius-card)] shadow-[var(--shadow-modal)] border border-[var(--color-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {showTestConfig ? (
                /* ── Test Configuration Sub-view ── */
                <>
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)]">
                    <button
                      onClick={() => setShowTestConfig(false)}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    </button>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-[var(--color-text)]">Printable Test</h2>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                        Configure your test before generating
                      </p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                    >
                      <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    </button>
                  </div>

                  <div className="px-5 py-4 space-y-5">
                    {/* Question types */}
                    <div>
                      <label className="text-sm font-semibold text-[var(--color-text)] mb-2 block">
                        Question types
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={testWritten}
                            onChange={(e) => setTestWritten(e.target.checked)}
                            className="accent-[var(--color-primary)]"
                          />
                          <span className="text-sm text-[var(--color-text)]">Written answers</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={testMultiple}
                            onChange={(e) => setTestMultiple(e.target.checked)}
                            className="accent-[var(--color-primary)]"
                          />
                          <span className="text-sm text-[var(--color-text)]">Multiple choice</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={testTrueFalse}
                            onChange={(e) => setTestTrueFalse(e.target.checked)}
                            className="accent-[var(--color-primary)]"
                          />
                          <span className="text-sm text-[var(--color-text)]">True / False</span>
                        </label>
                      </div>
                    </div>

                    {/* Answer direction */}
                    <div>
                      <label className="text-sm font-semibold text-[var(--color-text)] mb-2 block">
                        Answer with
                      </label>
                      <div className="flex items-center gap-1.5">
                        {directionOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTestDirection(opt.value)}
                            className={`${btnBase} ${testDirection === opt.value ? btnActive : btnInactive}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5">
                        {getDirectionHelp(testDirection)}
                      </p>
                    </div>

                    {/* Number of questions */}
                    <div>
                      <label className="text-sm font-semibold text-[var(--color-text)] mb-2 block">
                        Number of questions
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestCountChange(testQuestionCount - 1)}
                          disabled={testQuestionCount <= 1}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={testQuestionCount}
                          onChange={handleTestCountInput}
                          className="w-16 h-9 text-center text-sm font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleTestCountChange(testQuestionCount + 1)}
                          disabled={testQuestionCount >= maxTestQuestions}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {testPresets.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => handleTestCountChange(n)}
                            className={`${btnBase} ${testQuestionCount === n ? btnActive : btnInactive}`}
                          >
                            {n === cards.length ? `All (${n})` : n}
                          </button>
                        ))}
                      </div>
                      {testQuestionCount > cards.length && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5">
                          Cards will repeat evenly — each card appears at least {Math.floor(testQuestionCount / cards.length)} time{Math.floor(testQuestionCount / cards.length) !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Generate button */}
                  <div className="px-5 py-4 border-t border-[var(--color-border)]">
                    <button
                      onClick={handleGenerateTest}
                      disabled={generating !== null}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {generating === 'test' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Generate Test
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* ── Main Activity Picker ── */
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--color-text)]">Print Activities</h2>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                        {cards.length} card{cards.length !== 1 ? 's' : ''} in this set
                      </p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                    >
                      <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    </button>
                  </div>

                  {/* Config section */}
                  <div className="px-5 py-4 border-b border-[var(--color-border)] space-y-4">
                    {/* Card count */}
                    <div>
                      <label className="text-sm font-semibold text-[var(--color-text)] mb-2 block">
                        Number of cards
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCountChange(count - 1)}
                          disabled={count <= 1}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={count}
                          onChange={handleCountInput}
                          className="w-16 h-9 text-center text-sm font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleCountChange(count + 1)}
                          disabled={count >= maxCount}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {presets.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => handleCountChange(n)}
                            className={`${btnBase} ${count === n ? btnActive : btnInactive}`}
                          >
                            {n === cards.length ? `All (${n})` : n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Answer direction */}
                    <div>
                      <label className="text-sm font-semibold text-[var(--color-text)] mb-2 block">
                        Answer with
                      </label>
                      <div className="flex items-center gap-1.5">
                        {directionOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDirection(opt.value)}
                            className={`${btnBase} ${direction === opt.value ? btnActive : btnInactive}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5">
                        {getDirectionHelp(direction)}
                      </p>
                    </div>
                  </div>

                  {/* Activities grid */}
                  <div className="p-5 grid grid-cols-2 gap-3">
                    {count < 2 && (
                      <div className="col-span-2 text-center py-3 text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface-muted)] rounded-lg">
                        Select at least 2 cards to generate most activities.
                      </div>
                    )}

                    {/* Printable Test — opens config sub-view */}
                    <button
                      disabled={cards.length < 2 || generating !== null}
                      onClick={() => setShowTestConfig(true)}
                      className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                        cards.length < 2 || generating !== null
                          ? 'border-[var(--color-border)] opacity-50 cursor-not-allowed'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)] cursor-pointer'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-2">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-text)]">Printable Test</span>
                      <span className="text-xs text-[var(--color-text-tertiary)] mt-0.5 leading-relaxed">
                        Written, multiple choice, and true/false questions.
                      </span>
                    </button>

                    {nonTestActivities.map((activity) => {
                      const Icon = activity.icon;
                      const disabled = count < activity.minCards || generating !== null;
                      const isGenerating = generating === activity.key;

                      return (
                        <button
                          key={activity.key}
                          disabled={disabled}
                          onClick={() => handleGenerate(activity)}
                          className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                            disabled
                              ? 'border-[var(--color-border)] opacity-50 cursor-not-allowed'
                              : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)] cursor-pointer'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${activity.color} flex items-center justify-center mb-2`}>
                            {isGenerating ? (
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : (
                              <Icon className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <span className="text-sm font-semibold text-[var(--color-text)]">
                            {activity.label}
                          </span>
                          <span className="text-xs text-[var(--color-text-tertiary)] mt-0.5 leading-relaxed">
                            {isGenerating ? 'Generating PDF...' : activity.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-[var(--color-border)] text-center">
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">
                      PDFs are generated locally — no data is sent to any server.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
