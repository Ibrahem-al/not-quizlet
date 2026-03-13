import { motion } from 'framer-motion';
import { Button } from '../../../ui';
import type { RaceGameState } from './types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface Props {
  gameState: RaceGameState;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function RaceToFinishResults({ gameState, onPlayAgain, onExit }: Props) {
  const winner = gameState.winner;
  const isSolo = gameState.players.length === 1;
  const accuracy =
    gameState.questionsAnswered > 0
      ? Math.round((gameState.correctAnswers / gameState.questionsAnswered) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
      className="max-w-md mx-auto p-6 space-y-6"
    >
      {/* Celebration particles */}
      <div className="relative h-0">
        {Array.from({ length: 16 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
            }}
            initial={{ y: 0, opacity: 1 }}
            animate={{
              y: [0, -120 - Math.random() * 80],
              opacity: [1, 0],
              x: [-20 + Math.random() * 40, -40 + Math.random() * 80],
            }}
            transition={{
              duration: 1.5 + Math.random(),
              delay: Math.random() * 0.5,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* Winner */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, y: [0, -8, 0] }}
          transition={{
            scale: { ...spring, delay: 0.1 },
            y: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
          }}
          className="text-6xl"
        >
          🏆
        </motion.div>
        {isSolo ? (
          <>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">
              You Finished!
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              You reached the finish line with {accuracy}% accuracy!
            </p>
          </>
        ) : winner && (
          <>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">
              <span className="text-3xl mr-2">{winner.emoji}</span>
              {winner.name} Wins!
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              First to reach the finish line!
            </p>
          </>
        )}
      </div>

      {/* Player standings (only for multiplayer) */}
      {!isSolo && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Final Standings
          </p>
          {[...gameState.players]
            .sort((a, b) => b.position - a.position)
            .map((player, rank) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: 0.2 + rank * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  rank === 0
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                }`}
              >
                <span className="text-lg font-bold text-[var(--color-text-secondary)] w-6">
                  #{rank + 1}
                </span>
                <div className={`w-8 h-8 rounded-full ${player.bgColor} flex items-center justify-center`}>
                  <span>{player.emoji}</span>
                </div>
                <span className="font-medium text-[var(--color-text)] flex-1">{player.name}</span>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Cell {player.position + 1}
                </span>
              </motion.div>
            ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.5 }}
          className="p-3 rounded-xl bg-[var(--color-text-secondary)]/5 border border-[var(--color-border)] text-center"
        >
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Accuracy
          </p>
          <p className="text-lg font-bold text-[var(--color-text)] tabular-nums">{accuracy}%</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.55 }}
          className="p-3 rounded-xl bg-[var(--color-text-secondary)]/5 border border-[var(--color-border)] text-center"
        >
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Questions
          </p>
          <p className="text-lg font-bold text-[var(--color-text)] tabular-nums">
            {gameState.questionsAnswered}
          </p>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={onPlayAgain} className="flex-1">
          Play Again
        </Button>
        <Button onClick={onExit} variant="secondary" className="flex-1">
          Exit
        </Button>
      </div>
    </motion.div>
  );
}
