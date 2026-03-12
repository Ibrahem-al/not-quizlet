import { motion } from 'framer-motion';
import { Button } from '../../../ui';
import type { GameState, BlockBuilderConfig } from './types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface BlockBuilderResultsProps {
  gameState: GameState;
  config: BlockBuilderConfig;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function BlockBuilderResults({ gameState, config, onPlayAgain, onExit }: BlockBuilderResultsProps) {
  const isWin = gameState.phase === 'won';
  const accuracy =
    gameState.questionsAnswered > 0
      ? Math.round((gameState.correctAnswers / gameState.questionsAnswered) * 100)
      : 0;
  const timeSurvived = Math.round((Date.now() - gameState.startTime) / 1000);
  const minutes = Math.floor(timeSurvived / 60);
  const seconds = timeSurvived % 60;


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
      className="max-w-md mx-auto p-6 space-y-6"
    >
      {/* Floating celebration particles for win */}
      {isWin && (
        <div className="relative h-0">
          {Array.from({ length: 12 }, (_, i) => (
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
      )}

      {/* Title */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={isWin ? { scale: 1, y: [0, -8, 0] } : { scale: 1 }}
          transition={isWin
            ? { scale: { ...spring, delay: 0.1 }, y: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } }
            : { ...spring, delay: 0.1 }
          }
          className="text-5xl"
        >
          {isWin ? '🚁' : '🌋'}
        </motion.div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">
          {isWin
            ? 'Rescued!'
            : config.infinityMode
            ? 'Nice Run!'
            : 'Game Over'}
        </h2>
        {isWin && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            The helicopter got you to safety!
          </p>
        )}
        {config.infinityMode && !isWin && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            You survived {gameState.questionsAnswered} questions
          </p>
        )}
      </div>

      {/* Score */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring, delay: 0.2 }}
        className="text-center p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-[var(--color-border)]"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
          Final Score
        </p>
        <p className="text-4xl font-bold text-[var(--color-text)] tabular-nums">{gameState.score}</p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Accuracy" value={`${accuracy}%`} delay={0.3} />
        <StatCard label="Time" value={`${minutes}:${seconds.toString().padStart(2, '0')}`} delay={0.35} />
        <StatCard label="Correct" value={`${gameState.correctAnswers}`} delay={0.4} />
        <StatCard label="Wrong" value={`${gameState.wrongAnswers}`} delay={0.45} />
        <StatCard label="Max Tower" value={`${gameState.maxBlocks} blocks`} delay={0.5} />
        <StatCard label="Best Streak" value={`${gameState.streak}x`} delay={0.55} />
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

function StatCard({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      className="p-3 rounded-xl bg-[var(--color-text-secondary)]/5 border border-[var(--color-border)] text-center"
    >
      <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-[var(--color-text)] tabular-nums">{value}</p>
    </motion.div>
  );
}
