import { CheckCircle, XCircle } from 'lucide-react';
import type { LiveQuestion, ReceivedAnswer } from '../../types/liveGame';
import type { PlayerEntry } from '../../types/liveGame';

const OPTION_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-400', 'bg-green-500'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

interface HostRevealViewProps {
  question: LiveQuestion;
  receivedAnswers: ReceivedAnswer[];
  players: PlayerEntry[];
  questionNumber: number;
  totalQuestions: number;
  onLeaderboard: () => void;
}

export function HostRevealView({
  question,
  receivedAnswers,
  players,
  questionNumber,
  totalQuestions,
  onLeaderboard,
}: HostRevealViewProps) {
  const nonHostPlayers = players.filter((p) => p.nickname !== 'Host');

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 flex items-center justify-between">
        <span className="text-white font-semibold text-sm">
          Question {questionNumber} / {totalQuestions} — Results
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center px-8 py-6 gap-6 max-w-2xl mx-auto w-full">
        {/* Question */}
        <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 text-center shadow">
          <div
            className="text-2xl font-bold text-[var(--color-text)]"
            dangerouslySetInnerHTML={{ __html: question.term }}
          />
        </div>

        {/* Options with correct/wrong highlight */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {question.options.map((opt, i) => {
            const isCorrect = (question.correctOptionIndices ?? [question.correctOptionIndex]).includes(i);
            return (
              <div
                key={i}
                className={`rounded-2xl p-4 text-white flex items-center gap-3 transition-opacity ${
                  isCorrect ? OPTION_COLORS[i] : 'bg-gray-400/60'
                }`}
              >
                <span className="font-black text-base w-6 shrink-0">{OPTION_LABELS[i]}</span>
                <div
                  className="flex-1 text-base font-medium line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: opt }}
                />
                {isCorrect && <CheckCircle className="w-5 h-5 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Per-player results */}
        {nonHostPlayers.length > 0 && (
          <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Player Results</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {nonHostPlayers.map((p) => {
                const ans = receivedAnswers.find((a) => a.playerToken === p.playerToken);
                return (
                  <div key={p.playerToken} className="flex items-center gap-3 text-sm">
                    {ans?.isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="flex-1 text-[var(--color-text)]">{p.nickname}</span>
                    <span className="font-bold text-[var(--color-text-secondary)]">
                      {ans ? `+${ans.pointsEarned}` : 'No answer'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={onLeaderboard}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all"
        >
          Show Leaderboard
        </button>
      </div>
    </div>
  );
}
