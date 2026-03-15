import { motion } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

export interface MatchTileData {
  cardId: string;
  text: string;
  type: 'term' | 'definition';
  tileIndex: number;
}

interface MatchTileProps {
  cardId: string;
  text: string;
  type: 'term' | 'definition';
  tileIndex: number;
  matched: boolean;
  selected?: boolean;
  onDrop?: (dragged: MatchTileData, target: MatchTileData) => void;
  onSelect?: (tile: MatchTileData) => void;
  draggable?: boolean;
}

export function MatchTile({
  cardId,
  text,
  type,
  tileIndex,
  matched,
  selected = false,
  onDrop,
  onSelect,
  draggable = true,
}: MatchTileProps) {
  const tileData: MatchTileData = { cardId, text, type, tileIndex };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(tileData));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as MatchTileData;
      if (data.tileIndex === tileIndex) return; // same tile
      onDrop?.(data, tileData);
    } catch {
      // ignore
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleClick = () => {
    onSelect?.(tileData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(tileData);
    }
  };

  if (matched) {
    return (
      <motion.div
        className="rounded-lg bg-[var(--color-success)]/20 border-2 border-[var(--color-success)]/50 p-3 min-h-[60px] flex items-center justify-center"
        initial={{ scale: 1.2, opacity: 1 }}
        animate={{ scale: 0, opacity: 0 }}
        transition={spring}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`rounded-lg bg-[var(--color-surface)] border-2 p-3 min-h-[60px] flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[var(--shadow-card)] transition-colors ${
        selected
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
          : 'border-[var(--color-text-secondary)]/30'
      }`}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${type === 'term' ? 'Term' : 'Definition'} tile`}
    >
      <motion.div
        className={`text-base text-[var(--color-text)] text-center study-content ${
          (text.match(/<img[\s>]/gi) || []).length > 2 ? 'overflow-auto' : 'line-clamp-2'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={spring}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  );
}
