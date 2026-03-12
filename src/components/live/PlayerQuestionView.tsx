import { CountdownRing } from './CountdownRing';
import type { LiveQuestion } from '../../types/liveGame';

const OPTION_COLORS = [
  { bg: 'bg-red-500 active:bg-red-700', label: 'A', disabled: 'bg-red-300' },
  { bg: 'bg-blue-500 active:bg-blue-700', label: 'B', disabled: 'bg-blue-300' },
  { bg: 'bg-yellow-400 active:bg-yellow-600', label: 'C', disabled: 'bg-yellow-200' },
  { bg: 'bg-green-500 active:bg-green-700', label: 'D', disabled: 'bg-green-300' },
];

interface PlayerQuestionViewProps {
  question: Omit<LiveQuestion, 'correctOptionIndex'>;
  myAnswer: { chosenOption: number } | null;
  timerMs: number;
  onAnswer: (index: number) => void;
}

export function PlayerQuestionView({ question, myAnswer, timerMs, onAnswer }: PlayerQuestionViewProps) {
  const hasAnswered = myAnswer !== null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Timer bar */}
      <div className="h-1.5 bg-[var(--color-border)] w-full">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-[width] duration-100"
          style={{ width: `${Math.max(0, (timerMs / question.timeLimitMs) * 100)}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-center pt-4 pb-2">
          <CountdownRing totalMs={question.timeLimitMs} remainingMs={timerMs} size={64} />
        </div>

        <div className="px-4 pb-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 text-center shadow">
            {question.imageData && (
              <img
                src={question.imageData}
                alt="Question"
                className="max-h-32 mx-auto mb-3 rounded-xl object-contain"
              />
            )}
            <div
              className="text-lg font-bold text-[var(--color-text)]"
              dangerouslySetInnerHTML={{ __html: question.term }}
            />
          </div>
        </div>

        {/* Answer buttons - 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-6">
          {question.options.map((opt, i) => {
            const col = OPTION_COLORS[i];
            const isSelected = myAnswer?.chosenOption === i;
            const isDisabled = hasAnswered && !isSelected;

            return (
              <button
                key={i}
                onClick={() => !hasAnswered && onAnswer(i)}
                disabled={hasAnswered}
                className={`relative rounded-2xl p-4 text-white text-left transition-all min-h-[90px] flex flex-col justify-between
                  ${isDisabled ? col.disabled : col.bg}
                  ${isSelected ? 'ring-4 ring-white scale-105' : ''}
                  ${!hasAnswered ? 'hover:scale-[1.02] hover:shadow-lg' : ''}
                  disabled:cursor-default`}
              >
                <span className="font-black text-xl">{col.label}</span>
                <div
                  className="text-sm font-medium line-clamp-2 mt-1"
                  dangerouslySetInnerHTML={{ __html: opt }}
                />
              </button>
            );
          })}
        </div>

        {hasAnswered && (
          <div className="text-center text-[var(--color-text-secondary)] text-sm pb-8 animate-pulse">
            Answer locked in — waiting for results…
          </div>
        )}
      </div>
    </div>
  );
}
