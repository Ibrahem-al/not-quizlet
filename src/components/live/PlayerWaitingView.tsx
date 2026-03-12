import { Users } from 'lucide-react';
import { getAvatarColor } from '../../lib/liveGameUtils';

interface PlayerWaitingViewProps {
  nickname: string;
  gameCode: string;
  playerCount: number;
}

export function PlayerWaitingView({ nickname, gameCode, playerCount }: PlayerWaitingViewProps) {
  const color = getAvatarColor(nickname);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Avatar */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-black shadow-2xl border-4 border-white/40"
          style={{ backgroundColor: color }}
        >
          {nickname.charAt(0).toUpperCase()}
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">{nickname}</h2>
          <p className="text-white/80 mt-1">Game #{gameCode}</p>
        </div>

        {/* Waiting indicator */}
        <div className="bg-white/20 rounded-2xl px-8 py-6 backdrop-blur">
          <p className="text-white font-semibold text-lg">Waiting for host to start…</p>
          <div className="flex justify-center gap-1.5 mt-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 bg-white rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        {/* Player count */}
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <Users className="w-4 h-4" />
          <span>{playerCount} player{playerCount !== 1 ? 's' : ''} in lobby</span>
        </div>
      </div>
    </div>
  );
}
