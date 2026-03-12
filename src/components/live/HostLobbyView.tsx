import { Copy, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerChip } from './PlayerChip';
import type { PlayerEntry } from '../../types/liveGame';

interface HostLobbyViewProps {
  gameCode: string;
  players: PlayerEntry[];
  setTitle: string;
  onStart: () => void;
  isStarting: boolean;
}

export function HostLobbyView({ gameCode, players, setTitle, onStart, isStarting }: HostLobbyViewProps) {
  const nonHostPlayers = players.filter((p) => p.nickname !== 'Host');
  const joinUrl = `${window.location.origin}/live`;

  const copyCode = () => navigator.clipboard.writeText(gameCode).catch(() => {});
  const copyUrl = () => navigator.clipboard.writeText(`${joinUrl}?code=${gameCode}`).catch(() => {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-medium mb-3">
            <Zap className="w-4 h-4" /> Live Game
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow">{setTitle}</h1>
          <p className="text-white/80 mt-1">Waiting for players to join…</p>
        </div>

        {/* Game code */}
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Game Code</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl font-black tracking-[0.3em] text-gray-900 font-mono">
              {gameCode}
            </span>
            <button
              onClick={copyCode}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              title="Copy code"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Players go to{' '}
            <button onClick={copyUrl} className="font-semibold text-orange-500 hover:underline">
              {joinUrl}
            </button>{' '}
            and enter this code
          </p>
        </div>

        {/* Players */}
        <div className="bg-white/95 rounded-2xl shadow-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="font-bold text-gray-700">{nonHostPlayers.length} player{nonHostPlayers.length !== 1 ? 's' : ''} joined</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {nonHostPlayers.map((p) => (
                <motion.div
                  key={p.playerToken}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <PlayerChip nickname={p.nickname} isOnline={p.isOnline} />
                </motion.div>
              ))}
            </AnimatePresence>
            {nonHostPlayers.length === 0 && (
              <div className="col-span-full text-center text-gray-400 text-sm py-4">
                No players yet — share the code above
              </div>
            )}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          disabled={nonHostPlayers.length === 0 || isStarting}
          className="w-full py-4 rounded-2xl bg-white font-bold text-orange-500 text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isStarting ? 'Starting…' : `Start Game (${nonHostPlayers.length} player${nonHostPlayers.length !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  );
}
