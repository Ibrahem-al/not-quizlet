import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarColor } from '../../lib/liveGameUtils';
import type { PlayerEntry } from '../../types/liveGame';

interface PlayerLeaderboardViewProps {
  players: PlayerEntry[];
  myPlayerToken: string | null;
  questionIndex: number;
  totalQuestions: number;
}

export function PlayerLeaderboardView({ players, myPlayerToken, questionIndex, totalQuestions }: PlayerLeaderboardViewProps) {
  const ranked = [...players]
    .filter((p) => p.nickname !== 'Host')
    .sort((a, b) => b.score - a.score);

  const myRank = ranked.findIndex((p) => p.playerToken === myPlayerToken) + 1;
  const myEntry = ranked.find((p) => p.playerToken === myPlayerToken);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white">Leaderboard</h2>
          <p className="text-white/70 text-sm mt-1">After question {questionIndex + 1} of {totalQuestions}</p>
        </div>

        {/* My position */}
        {myEntry && (
          <div className="bg-white rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl font-black text-purple-500">#{myRank}</span>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: getAvatarColor(myEntry.nickname) }}
            >
              {myEntry.nickname.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{myEntry.nickname}</p>
              <p className="text-sm text-gray-500">{myEntry.score.toLocaleString()} pts</p>
            </div>
          </div>
        )}

        {/* Full list */}
        <div className="space-y-2">
          <AnimatePresence>
            {ranked.slice(0, 5).map((p, i) => {
              const isMe = p.playerToken === myPlayerToken;
              return (
                <motion.div
                  key={p.playerToken}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isMe ? 'bg-white' : 'bg-white/80'}`}
                >
                  <span className="text-sm font-black text-gray-400 w-5">#{i + 1}</span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: getAvatarColor(p.nickname) }}
                  >
                    {p.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className={`flex-1 font-semibold truncate text-sm ${isMe ? 'text-purple-700' : 'text-gray-700'}`}>
                    {p.nickname} {isMe && '(you)'}
                  </span>
                  <span className="font-black text-gray-900 text-sm">{p.score.toLocaleString()}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <p className="text-center text-white/70 text-sm animate-pulse">Waiting for next question…</p>
      </div>
    </div>
  );
}
