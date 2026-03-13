import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../ui';
import { Input } from '../../../ui';
import type { RaceQuestion } from './types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

/** Split HTML into text HTML and an array of image src strings */
function splitContent(html: string): { textHtml: string; images: string[] } {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi;
  const images: string[] = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
  }
  // Remove <img> tags and empty <p> wrappers left behind
  const textHtml = html
    .replace(/<img[^>]*\/?>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
  return { textHtml, images };
}

/** Render rich content with images laid out horizontally in a grid */
function RaceContent({ html, className }: { html: string; className?: string }) {
  const { textHtml, images } = useMemo(() => splitContent(html), [html]);
  const count = images.length;
  const countAttr = count >= 5 ? 'many' : String(count);

  return (
    <div className={`race-question-content ${className ?? ''}`}>
      {textHtml && <div dangerouslySetInnerHTML={{ __html: textHtml }} />}
      {count > 0 && (
        <div className="race-img-grid" data-count={countAttr}>
          {images.map((src, i) => (
            <img key={i} src={src} alt="" />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  question: RaceQuestion;
  playerName: string;
  playerEmoji: string;
  playerColor: string;
  isSolo: boolean;
  lastAnswerCorrect: boolean | null;
  onSubmitWritten: (input: string) => void;
  onSubmitMultiple: (index: number) => void;
  onSubmitTrueFalse: (value: boolean) => void;
}

export function RaceQuestionPanel({
  question,
  playerName,
  playerEmoji,
  playerColor,
  isSolo,
  lastAnswerCorrect,
  onSubmitWritten,
  onSubmitMultiple,
  onSubmitTrueFalse,
}: Props) {
  const [writtenInput, setWrittenInput] = useState('');

  const handleSubmitWritten = useCallback(() => {
    if (!writtenInput.trim()) return;
    onSubmitWritten(writtenInput);
    setWrittenInput('');
  }, [writtenInput, onSubmitWritten]);

  const feedbackBorder =
    lastAnswerCorrect === true
      ? 'ring-2 ring-green-400/60'
      : lastAnswerCorrect === false
      ? 'ring-2 ring-red-400/60'
      : '';

  return (
    <div className={`flex flex-col h-full transition-shadow duration-300 rounded-2xl ${feedbackBorder}`}>
      {/* Player indicator */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <span className="text-xl">{playerEmoji}</span>
          <span className={`font-bold ${playerColor}`}>{isSolo ? 'Your Turn' : `${playerName}'s Turn`}</span>
        </div>
        {lastAnswerCorrect !== null && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-sm font-bold ${lastAnswerCorrect ? 'text-green-500' : 'text-red-500'}`}
          >
            {lastAnswerCorrect ? 'Correct! Roll the dice!' : isSolo ? 'Wrong! Try again next round.' : 'Wrong! Turn skipped.'}
          </motion.span>
        )}
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${question.card.id}-${question.type}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={spring}
            className="flex flex-col gap-4"
          >
            {/* Prompt card — images scaled down, multiple images go horizontal */}
            <div className="p-4 rounded-xl bg-[var(--color-primary-muted)]/30 border border-[var(--color-border)]">
              <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                {question.answerWith === 'definition' ? 'Term' : 'Definition'}
              </p>
              <RaceContent html={question.prompt} className="text-lg font-medium text-[var(--color-text)]" />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                Your answer
              </span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

            {/* Written */}
            {question.type === 'written' && (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Type the {question.answerWith}:
                </p>
                <Input
                  placeholder={`Enter the ${question.answerWith}...`}
                  value={writtenInput}
                  onChange={(e) => setWrittenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitWritten()}
                  autoFocus
                />
                <Button onClick={handleSubmitWritten} className="w-full">
                  Submit
                </Button>
              </div>
            )}

            {/* Multiple choice */}
            {question.type === 'multiple' && question.options && (
              <div className="flex flex-col gap-2">
                {question.options.map((opt, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    className="justify-start text-left h-auto min-h-[44px] py-2"
                    onClick={() => onSubmitMultiple(i)}
                  >
                    <RaceContent html={opt} />
                  </Button>
                ))}
              </div>
            )}

            {/* True / False */}
            {question.type === 'truefalse' && question.options && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[var(--color-background)] border-2 border-dashed border-[var(--color-border)]">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                    Proposed {question.answerWith === 'definition' ? 'Definition' : 'Term'}
                  </p>
                  <RaceContent html={question.options[0]} className="text-base text-[var(--color-text)]" />
                </div>
                <p className="text-center text-sm font-medium text-[var(--color-text)]">
                  Is this correct?
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => onSubmitTrueFalse(true)}
                    variant="secondary"
                    className="min-w-[100px] bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/30"
                  >
                    True
                  </Button>
                  <Button
                    onClick={() => onSubmitTrueFalse(false)}
                    variant="secondary"
                    className="min-w-[100px] bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/30"
                  >
                    False
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
