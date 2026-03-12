import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { getAvatarColor } from '../../lib/liveGameUtils';
import type { PlayerEntry } from '../../types/liveGame';

interface HostFinishedViewProps {
  players: PlayerEntry[];
  setTitle: string;
  setId?: string;
}

export function HostFinishedView({ players, setTitle, setId }: HostFinishedViewProps) {
  const ranked = [...players]
    .filter((p) => p.nickname !== 'Host')
    .sort((a, b) => b.score - a.score);

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-2">🎉</div>
          <h1 className="text-3xl font-black text-white drop-shadow">Game Over!</h1>
          <p className="text-white/80 mt-1">{setTitle}</p>
        </div>

        {/* Podium */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-3">
            {/* 2nd place */}
            {top3[1] && (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: getAvatarColor(top3[1].nickname) }}
                >
                  {top3[1].nickname.charAt(0).toUpperCase()}
                </div>
                <div className="bg-white/90 rounded-t-xl px-4 py-3 text-center" style={{ height: 80 }}>
                  <div className="text-2xl">🥈</div>
                  <p className="text-xs font-bold text-gray-700 truncate max-w-[80px]">{top3[1].nickname}</p>
                  <p className="text-sm font-black text-gray-900">{top3[1].score.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* 1st place */}
            {top3[0] && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-4xl">👑</div>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl border-4 border-yellow-300"
                  style={{ backgroundColor: getAvatarColor(top3[0].nickname) }}
                >
                  {top3[0].nickname.charAt(0).toUpperCase()}
                </div>
                <div className="bg-white rounded-t-xl px-4 py-3 text-center" style={{ height: 100 }}>
                  <div className="text-3xl">🥇</div>
                  <p className="text-xs font-bold text-gray-700 truncate max-w-[90px]">{top3[0].nickname}</p>
                  <p className="text-base font-black text-gray-900">{top3[0].score.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* 3rd place */}
            {top3[2] && (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: getAvatarColor(top3[2].nickname) }}
                >
                  {top3[2].nickname.charAt(0).toUpperCase()}
                </div>
                <div className="bg-white/90 rounded-t-xl px-4 py-3 text-center" style={{ height: 64 }}>
                  <div className="text-2xl">🥉</div>
                  <p className="text-xs font-bold text-gray-700 truncate max-w-[80px]">{top3[2].nickname}</p>
                  <p className="text-sm font-black text-gray-900">{top3[2].score.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rest of players */}
        {rest.length > 0 && (
          <div className="bg-white/90 rounded-2xl p-4 space-y-2">
            {rest.map((p, i) => (
              <div key={p.playerToken} className="flex items-center gap-3 text-sm">
                <span className="font-bold text-gray-400 w-6 text-center">#{i + 4}</span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: getAvatarColor(p.nickname) }}
                >
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 font-medium text-gray-800">{p.nickname}</span>
                <span className="font-bold text-gray-900">{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {setId && (
            <Link to={`/sets/${setId}`} className="flex-1">
              <button className="w-full py-3 rounded-xl bg-white/20 text-white font-bold border-2 border-white/40 hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Back to Set
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
