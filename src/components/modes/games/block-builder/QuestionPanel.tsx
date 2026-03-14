import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../ui';
import { Input } from '../../../ui';
import type { BlockBuilderQuestion } from './types';
import { InputDiacriticsToolbar } from '../../../editor/InputDiacriticsToolbar';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface QuestionPanelProps {
  question: BlockBuilderQuestion;
  questionIndex: number;
  totalAnswered: number;
  totalQuestions: number | null; // null for infinity
  lastAnswerCorrect: boolean | null;
  onSubmitWritten: (input: string) => void;
  onSubmitMultiple: (index: number) => void;
  onSubmitTrueFalse: (value: boolean) => void;
}

export function QuestionPanel({
  question,
  questionIndex,
  totalAnswered,
  totalQuestions,
  lastAnswerCorrect,
  onSubmitWritten,
  onSubmitMultiple,
  onSubmitTrueFalse,
}: QuestionPanelProps) {
  const [writtenInput, setWrittenInput] = useState('');
  const writtenInputRef = useRef<HTMLInputElement>(null);

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
      {/* Progress */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {totalQuestions ? `${totalAnswered + 1} / ${totalQuestions}` : `Question ${totalAnswered + 1}`}
        </span>
        {lastAnswerCorrect !== null && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-sm font-bold ${lastAnswerCorrect ? 'text-green-500' : 'text-red-500'}`}
          >
            {lastAnswerCorrect ? 'Correct!' : 'Wrong!'}
          </motion.span>
        )}
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={questionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={spring}
            className="flex flex-col gap-5"
          >
            {/* Prompt card */}
            <div className="p-4 rounded-xl bg-[var(--color-primary-muted)]/30 border border-[var(--color-border)]">
              <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                {question.answerWith === 'definition' ? 'Term' : 'Definition'}
              </p>
              <div
                className="text-lg font-medium text-[var(--color-text)] study-content"
                dangerouslySetInnerHTML={{ __html: question.prompt }}
              />
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
                  ref={writtenInputRef}
                  placeholder={`Enter the ${question.answerWith}...`}
                  value={writtenInput}
                  onChange={(e) => setWrittenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitWritten()}
                  autoFocus
                />
                <InputDiacriticsToolbar
                  inputRef={writtenInputRef}
                  value={writtenInput}
                  onValueChange={setWrittenInput}
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
                    <div className="study-content" dangerouslySetInnerHTML={{ __html: opt }} />
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
                  <div
                    className="text-base text-[var(--color-text)] study-content"
                    dangerouslySetInnerHTML={{ __html: question.options[0] }}
                  />
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
