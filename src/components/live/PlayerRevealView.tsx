import { CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlayerRevealViewProps {
  isCorrect: boolean;
  pointsEarned: number;
  myChosenOption: number | null;
  correctOptionIndex: number;
  options: string[];
}

const OPTION_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-400', 'bg-green-500'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function PlayerRevealView({ isCorrect, pointsEarned, myChosenOption, correctOptionIndex, options }: PlayerRevealViewProps) {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex flex-col items-center gap-6 text-center max-w-sm w-full"
      >
        {isCorrect ? (
          <CheckCircle className="w-24 h-24 text-white" />
        ) : (
          <XCircle className="w-24 h-24 text-white" />
        )}

        <div>
          <h2 className="text-4xl font-black text-white">
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </h2>
          {isCorrect && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white/90 mt-2"
            >
              +{pointsEarned.toLocaleString()} pts
            </motion.p>
          )}
        </div>

        {/* Correct answer highlight */}
        <div className="w-full space-y-2">
          <p className="text-white/80 text-sm font-medium">Correct answer:</p>
          <div className={`${OPTION_COLORS[correctOptionIndex]} rounded-2xl p-4 text-white flex items-center gap-3 ring-4 ring-white`}>
            <span className="font-black text-lg w-6">{OPTION_LABELS[correctOptionIndex]}</span>
            <div
              className="flex-1 text-sm font-medium text-left line-clamp-2"
              dangerouslySetInnerHTML={{ __html: options[correctOptionIndex] }}
            />
            <CheckCircle className="w-5 h-5 shrink-0" />
          </div>

          {!isCorrect && myChosenOption !== null && myChosenOption >= 0 && (
            <div className="bg-white/20 rounded-2xl p-4 text-white flex items-center gap-3">
              <span className="font-black text-lg w-6">{OPTION_LABELS[myChosenOption]}</span>
              <div
                className="flex-1 text-sm font-medium text-left line-clamp-2"
                dangerouslySetInnerHTML={{ __html: options[myChosenOption] }}
              />
              <XCircle className="w-5 h-5 shrink-0 opacity-60" />
            </div>
          )}
        </div>

        <p className="text-white/70 text-sm animate-pulse">Waiting for leaderboard…</p>
      </motion.div>
    </div>
  );
}
