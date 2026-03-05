import { motion } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

export interface MatchTileData {
  cardId: string;
  text: string;
  type: 'term' | 'definition';
}

interface MatchTileProps {
  cardId: string;
  text: string;
  type: 'term' | 'definition';
  matched: boolean;
  onDrop?: (dragged: MatchTileData, target: MatchTileData) => void;
  draggable?: boolean;
}

export function MatchTile({
  cardId,
  text,
  type,
  matched,
  onDrop,
  draggable = true,
}: MatchTileProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ cardId, text, type }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as MatchTileData;
      if (data.cardId === cardId && data.type === type) return; // same tile
      onDrop?.(data, { cardId, text, type });
    } catch {
      // ignore
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  if (matched) {
    return (
      <motion.div
        className="rounded-lg bg-[var(--color-success)]/20 border-2 border-[var(--color-success)]/50 p-3 min-h-[60px] flex items-center justify-center"
        initial={{ scale: 1.2, opacity: 1 }}
        animate={{ scale: 0, opacity: 0 }}
        transition={spring}
      />
    );
  }

  return (
    <div
      className="rounded-lg bg-[var(--color-surface)] border-2 border-[var(--color-text-secondary)]/30 p-3 min-h-[60px] flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[var(--shadow-card)]"
      draggable={draggable}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <motion.div
        className="text-sm text-[var(--color-text)] line-clamp-2 text-center"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={spring}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  );
}
