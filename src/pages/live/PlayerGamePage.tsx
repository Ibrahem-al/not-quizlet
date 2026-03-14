import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayerWaitingView } from '../../components/live/PlayerWaitingView';
import { PlayerQuestionView } from '../../components/live/PlayerQuestionView';
import { PlayerRevealView } from '../../components/live/PlayerRevealView';
import { PlayerLeaderboardView } from '../../components/live/PlayerLeaderboardView';
import { HostFinishedView } from '../../components/live/HostFinishedView';
import { useLiveGameStore } from '../../stores/liveGameStore';

export function PlayerGamePage() {
  const navigate = useNavigate();

  const status = useLiveGameStore((s) => s.status);
  const currentQuestion = useLiveGameStore((s) => s.currentQuestion);
  const currentQuestionIndex = useLiveGameStore((s) => s.currentQuestionIndex);
  const players = useLiveGameStore((s) => s.players);
  const playerToken = useLiveGameStore((s) => s.playerToken);
  const nickname = useLiveGameStore((s) => s.nickname);
  const gameCode = useLiveGameStore((s) => s.gameCode);
  const myAnswer = useLiveGameStore((s) => s.myAnswer);
  const timerRemainingMs = useLiveGameStore((s) => s.timerRemainingMs);
  const correctOptionIndex = useLiveGameStore((s) => s.correctOptionIndex);
  const correctOptionIndices = useLiveGameStore((s) => s.correctOptionIndices);
  const submitAnswer = useLiveGameStore((s) => s.submitAnswer);
  const questions = useLiveGameStore((s) => s.questions);

  // If no active session, redirect to join page
  useEffect(() => {
    if (status === 'idle') {
      navigate('/live', { replace: true });
    }
  }, [status, navigate]);

  if (!gameCode || !nickname) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const nonHostPlayers = players.filter((p) => p.nickname !== 'Host');

  return (
    <AnimatePresence mode="wait">
      {status === 'lobby' && (
        <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <PlayerWaitingView
            nickname={nickname}
            gameCode={gameCode}
            playerCount={nonHostPlayers.length}
          />
        </motion.div>
      )}

      {status === 'question' && currentQuestion && (
        <motion.div key={`question-${currentQuestionIndex}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
          <PlayerQuestionView
            question={currentQuestion}
            myAnswer={myAnswer}
            timerMs={timerRemainingMs}
            onAnswer={(i) => submitAnswer(i)}
          />
        </motion.div>
      )}

      {status === 'reveal' && currentQuestion && correctOptionIndex !== null && (
        <motion.div key="reveal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          <PlayerRevealView
            isCorrect={myAnswer != null && (correctOptionIndices ?? [correctOptionIndex]).includes(myAnswer.chosenOption)}
            pointsEarned={0}
            myChosenOption={myAnswer?.chosenOption ?? null}
            correctOptionIndex={correctOptionIndex}
            correctOptionIndices={correctOptionIndices ?? undefined}
            options={currentQuestion.options}
          />
        </motion.div>
      )}

      {status === 'leaderboard' && (
        <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <PlayerLeaderboardView
            players={players}
            myPlayerToken={playerToken}
            questionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
          />
        </motion.div>
      )}

      {status === 'finished' && (
        <motion.div key="finished" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HostFinishedView
            players={players}
            setTitle="Game Over"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
