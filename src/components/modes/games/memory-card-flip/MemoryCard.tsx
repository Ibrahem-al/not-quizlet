import { motion } from 'framer-motion';

interface MemoryCardProps {
  content: string;
  type: 'term' | 'definition';
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
}

export function MemoryCard({ content, type, isFlipped, isMatched, onClick }: MemoryCardProps) {
  if (isMatched) {
    return (
      <motion.div
        className="aspect-[3/4] rounded-xl"
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    );
  }

  return (
    <div
      className="aspect-[3/4] cursor-pointer [perspective:600px]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={isFlipped ? `Card showing ${type}` : 'Face-down card'}
    >
      <motion.div
        className="relative w-full h-full [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Back face (face-down) */}
        <div className="absolute inset-0 rounded-xl [backface-visibility:hidden] bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg flex items-center justify-center border-2 border-violet-400/30">
          <span className="text-3xl select-none">?</span>
        </div>

        {/* Front face (face-up) */}
        <div className="absolute inset-0 rounded-xl [backface-visibility:hidden] [transform:rotateY(180deg)] bg-[var(--color-surface)] border-2 border-[var(--color-border)] shadow-lg flex flex-col items-center justify-center p-2 overflow-hidden">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider mb-1 shrink-0 ${
              type === 'term' ? 'text-blue-500' : 'text-emerald-500'
            }`}
          >
            {type === 'term' ? 'T' : 'D'}
          </span>
          <div
            className="text-sm sm:text-base text-[var(--color-text)] text-center overflow-y-auto w-full flex-1 min-h-0 [&_img]:max-w-full [&_img]:max-h-[50px] [&_img]:object-contain [&_img]:mx-auto [&_img]:block"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </motion.div>
    </div>
  );
}
