import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { getAvatarColor } from '../../lib/liveGameUtils';
import type { PlayerEntry } from '../../types/liveGame';

interface HostLeaderboardViewProps {
  players: PlayerEntry[];
  questionIndex: number;
  totalQuestions: number;
  onNext: () => void;
}

export function HostLeaderboardView({ players, questionIndex, totalQuestions, onNext }: HostLeaderboardViewProps) {
  const ranked = [...players]
    .filter((p) => p.nickname !== 'Host')
    .sort((a, b) => b.score - a.score);

  const isLast = questionIndex >= totalQuestions - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4">
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2 text-white mb-1">
            <Trophy className="w-6 h-6" />
            <h2 className="text-2xl font-black">Leaderboard</h2>
          </div>
          <p className="text-white/70 text-sm">After question {questionIndex + 1} of {totalQuestions}</p>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {ranked.slice(0, 8).map((p, i) => (
              <motion.div
                key={p.playerToken}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
                  i === 0 ? 'bg-yellow-400 text-gray-900' : 'bg-white/90 text-gray-800'
                }`}
              >
                <span className={`text-lg font-black w-7 text-center ${i === 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: getAvatarColor(p.nickname) }}
                >
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 font-semibold truncate">{p.nickname}</span>
                <span className="font-black text-lg">{p.score.toLocaleString()}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-white font-bold text-purple-600 text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-100 transition-all mt-4"
        >
          {isLast ? 'Show Final Results' : 'Next Question →'}
        </button>
      </div>
    </div>
  );
}
