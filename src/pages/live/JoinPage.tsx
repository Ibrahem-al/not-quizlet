import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { GameCodeInput } from '../../components/live/GameCodeInput';
import { useLiveGameStore } from '../../stores/liveGameStore';
import { isSupabaseConfigured } from '../../lib/supabase';
import { loadPlayerSession } from '../../lib/liveGameUtils';

export function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [gameCode, setGameCode] = useState(searchParams.get('code') ?? '');
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState<'code' | 'nickname'>('code');
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const joinSession = useLiveGameStore((s) => s.joinSession);
  const status = useLiveGameStore((s) => s.status);
  const sessionId = useLiveGameStore((s) => s.sessionId);
  const isHost = useLiveGameStore((s) => s.isHost);

  // If Supabase not configured, show error
  const supabaseOk = isSupabaseConfigured();

  // Try to restore session from sessionStorage
  useEffect(() => {
    const saved = loadPlayerSession();
    if (saved) {
      setGameCode(saved.gameCode);
      setNickname(saved.nickname);
    }
  }, []);

  // Navigate when joined
  useEffect(() => {
    if (status === 'lobby' && sessionId && !isHost) {
      navigate(`/live/play`, { replace: true });
    }
    if ((status === 'question' || status === 'reveal' || status === 'leaderboard') && sessionId && !isHost) {
      navigate(`/live/play`, { replace: true });
    }
  }, [status, sessionId, isHost, navigate]);

  const handleCodeComplete = () => {
    if (gameCode.length === 6) setStep('nickname');
  };

  const handleJoin = async () => {
    if (!nickname.trim()) return;
    setJoining(true);
    setErrorMsg('');
    const ok = await joinSession(gameCode, nickname.trim());
    if (!ok) {
      setErrorMsg(useLiveGameStore.getState().error ?? 'Failed to join game.');
      setJoining(false);
    }
  };

  if (!supabaseOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <Zap className="w-10 h-10 text-orange-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Live Game Unavailable</h2>
          <p className="text-gray-500 text-sm">Supabase is not configured. Contact the app administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-gray-900">Live Game</span>
        </div>

        {step === 'code' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-black text-gray-900">Join a Game</h1>
              <p className="text-gray-500 text-sm mt-1">Enter the 6-digit code from your host</p>
            </div>

            <GameCodeInput
              value={gameCode}
              onChange={(code) => {
                setGameCode(code);
                setErrorMsg('');
                if (code.length === 6) setStep('nickname');
              }}
              disabled={joining}
            />

            {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}

            <button
              onClick={handleCodeComplete}
              disabled={gameCode.length < 6}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-100 transition-all"
            >
              Continue →
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-black text-gray-900">Choose a Nickname</h1>
              <p className="text-gray-500 text-sm mt-1">Game #{gameCode}</p>
            </div>

            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 20))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Your nickname"
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none text-gray-900 font-semibold text-center text-lg"
            />

            {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('code')}
                className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:border-gray-300 transition-colors"
              >
                ←
              </button>
              <button
                onClick={handleJoin}
                disabled={!nickname.trim() || joining}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-100 transition-all"
              >
                {joining ? 'Joining…' : 'Join Game!'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
