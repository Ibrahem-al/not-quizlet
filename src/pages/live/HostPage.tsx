import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HostLobbyView } from '../../components/live/HostLobbyView';
import { HostQuestionView } from '../../components/live/HostQuestionView';
import { HostRevealView } from '../../components/live/HostRevealView';
import { HostLeaderboardView } from '../../components/live/HostLeaderboardView';
import { HostFinishedView } from '../../components/live/HostFinishedView';
import { useLiveGameStore } from '../../stores/liveGameStore';
import { useAuthStore } from '../../stores/authStore';

export function HostPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isStarting, setIsStarting] = useState(false);

  const status = useLiveGameStore((s) => s.status);
  const gameCode = useLiveGameStore((s) => s.gameCode);
  const players = useLiveGameStore((s) => s.players);
  const questions = useLiveGameStore((s) => s.questions);
  const currentQuestionIndex = useLiveGameStore((s) => s.currentQuestionIndex);
  const timerRemainingMs = useLiveGameStore((s) => s.timerRemainingMs);
  const receivedAnswers = useLiveGameStore((s) => s.receivedAnswers);
  const correctOptionIndex = useLiveGameStore((s) => s.correctOptionIndex);
  const error = useLiveGameStore((s) => s.error);
  const leaveSession = useLiveGameStore((s) => s.leaveSession);
  const startGame = useLiveGameStore((s) => s.startGame);
  const revealAnswer = useLiveGameStore((s) => s.revealAnswer);
  const showLeaderboard = useLiveGameStore((s) => s.showLeaderboard);
  const advanceToNext = useLiveGameStore((s) => s.advanceToNext);

  const storeSessionId = useLiveGameStore((s) => s.sessionId);

  // Auth guard
  useEffect(() => {
    if (!user) navigate('/', { replace: true });
  }, [user, navigate]);

  // If store session doesn't match URL param, something went wrong
  useEffect(() => {
    if (status === 'idle' || (storeSessionId && storeSessionId !== sessionId)) {
      navigate('/', { replace: true });
    }
  }, [status, storeSessionId, sessionId, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only leave if game is finished to avoid disrupting active games on re-render
      if (useLiveGameStore.getState().status === 'finished') {
        leaveSession();
      }
    };
  }, [leaveSession]);

  const handleStart = async () => {
    setIsStarting(true);
    await startGame();
    setIsStarting(false);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-white font-bold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!gameCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const nonHostPlayers = players.filter((p) => p.nickname !== 'Host');

  return (
    <AnimatePresence mode="wait">
      {status === 'lobby' && (
        <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HostLobbyView
            gameCode={gameCode}
            players={players}
            setTitle="Live Game"
            onStart={handleStart}
            isStarting={isStarting}
          />
        </motion.div>
      )}

      {status === 'question' && currentQuestion && (
        <motion.div key="question" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <HostQuestionView
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            timerMs={timerRemainingMs}
            receivedAnswers={receivedAnswers}
            totalPlayers={nonHostPlayers.length}
            onReveal={revealAnswer}
          />
        </motion.div>
      )}

      {status === 'reveal' && currentQuestion && correctOptionIndex !== null && (
        <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HostRevealView
            question={currentQuestion}
            receivedAnswers={receivedAnswers}
            players={players}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            onLeaderboard={showLeaderboard}
          />
        </motion.div>
      )}

      {status === 'leaderboard' && (
        <motion.div key="leaderboard" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          <HostLeaderboardView
            players={players}
            questionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            onNext={advanceToNext}
          />
        </motion.div>
      )}

      {status === 'finished' && (
        <motion.div key="finished" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HostFinishedView
            players={players}
            setTitle="Live Game"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
