import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, FileText, LayoutGrid, Puzzle, Loader2, Minus, Plus } from 'lucide-react';
import type { Card } from '../../types';
import type { PrintConfig, AnswerDirection } from '../../lib/printables';
import {
  generateLineMatchingPDF,
  generateTestPDF,
  generateFlashcardsPDF,
  generateMatchingGamePDF,
} from '../../lib/printables';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  setTitle: string;
}

const activities = [
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
    key: 'test',
    label: 'Printable Test',
    description: 'Written, multiple choice, and true/false questions.',
    icon: FileText,
    color: 'from-purple-500 to-pink-500',
    minCards: 2,
    generate: generateTestPDF,
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

  const maxCount = cards.length;

  const handleCountChange = (val: number) => {
    setCount(Math.max(1, Math.min(val, maxCount)));
  };

  const handleCountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') { setCount(1); return; }
    handleCountChange(parseInt(raw, 10));
  };

  const presets = [...new Set([5, 10, 20, cards.length].filter(n => n >= 1 && n <= maxCount))];

  const config: PrintConfig = { count, direction };

  const handleGenerate = async (activity: (typeof activities)[number]) => {
    setGenerating(activity.key);
    try {
      await activity.generate(cards, setTitle, config);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(null);
    }
  };

  const btnBase = 'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all';
  const btnActive = 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]';
  const btnInactive = 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text)]">Print Activities</h2>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                    {cards.length} card{cards.length !== 1 ? 's' : ''} in this set
                  </p>
                </div>
                <button
                  onClick={onClose}
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
                {activities.map((activity) => {
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
