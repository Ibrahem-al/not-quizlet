import { getAvatarColor } from '../../lib/liveGameUtils';

interface PlayerChipProps {
  nickname: string;
  score?: number;
  isOnline?: boolean;
  rank?: number;
  showScore?: boolean;
}

export function PlayerChip({ nickname, score, isOnline = true, rank, showScore = false }: PlayerChipProps) {
  const color = getAvatarColor(nickname);
  const letter = nickname.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      {rank !== undefined && (
        <span className="text-xs font-bold text-[var(--color-text-tertiary)] w-5 text-center">
          #{rank}
        </span>
      )}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 relative"
        style={{ backgroundColor: color }}
      >
        {letter}
        {!isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gray-400 border-2 border-[var(--color-surface)]" />
        )}
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--color-surface)]" />
        )}
      </div>
      <span className="text-sm font-medium text-[var(--color-text)] truncate max-w-[120px]">{nickname}</span>
      {showScore && score !== undefined && (
        <span className="ml-auto text-sm font-bold text-[var(--color-text-secondary)]">{score.toLocaleString()}</span>
      )}
    </div>
  );
}
