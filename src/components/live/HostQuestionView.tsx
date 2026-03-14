import { CountdownRing } from './CountdownRing';
import type { LiveQuestion, ReceivedAnswer } from '../../types/liveGame';

const OPTION_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', label: 'A' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', label: 'B' },
  { bg: 'bg-yellow-400', hover: 'hover:bg-yellow-500', label: 'C' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', label: 'D' },
];

interface HostQuestionViewProps {
  question: LiveQuestion;
  questionNumber: number;
  totalQuestions: number;
  timerMs: number;
  receivedAnswers: ReceivedAnswer[];
  totalPlayers: number;
  onReveal: () => void;
}

export function HostQuestionView({
  question,
  questionNumber,
  totalQuestions,
  timerMs,
  receivedAnswers,
  totalPlayers,
  onReveal,
}: HostQuestionViewProps) {
  const answeredCount = receivedAnswers.length;
  const canReveal = timerMs <= 0 || answeredCount >= totalPlayers;

  // Count answers per option
  const optionCounts = question.options.map((_, i) =>
    receivedAnswers.filter((a) => a.chosenOption === i).length
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 flex items-center justify-between">
        <span className="text-white font-semibold text-sm">
          Question {questionNumber} / {totalQuestions}
        </span>
        <CountdownRing totalMs={question.timeLimitMs} remainingMs={timerMs} size={56} />
        <span className="text-white font-semibold text-sm">
          {answeredCount} / {totalPlayers} answered
        </span>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 gap-8">
        <div className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-lg text-center">
          {question.imageData && (
            <img
              src={question.imageData}
              alt="Question"
              className="max-h-40 mx-auto mb-4 rounded-xl object-contain"
            />
          )}
          <div
            className="text-3xl font-bold text-[var(--color-text)]"
            dangerouslySetInnerHTML={{ __html: question.term }}
          />
        </div>

        {/* Answer options */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
          {question.options.map((opt, i) => {
            const col = OPTION_COLORS[i];
            const count = optionCounts[i];
            return (
              <div
                key={i}
                className={`${col.bg} rounded-2xl p-4 text-white flex items-center gap-3 relative overflow-hidden`}
              >
                <span className="font-black text-lg w-7 shrink-0">{col.label}</span>
                <div
                  className="flex-1 text-base font-medium line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: opt }}
                />
                {count > 0 && (
                  <span className="ml-auto bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Reveal button */}
        <button
          onClick={onReveal}
          disabled={!canReveal}
          className="px-10 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {canReveal ? 'Reveal Answer' : `Waiting… (${answeredCount}/${totalPlayers})`}
        </button>
      </div>
    </div>
  );
}
