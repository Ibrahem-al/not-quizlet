import { Button } from '../../../ui';
import type { RaceConfig, AnswerDirection } from './types';
import { PLAYER_THEMES } from './types';

interface Props {
  config: RaceConfig;
  setConfig: React.Dispatch<React.SetStateAction<RaceConfig>>;
  cardCount: number;
  onStart: () => void;
  onExit: () => void;
}

export function RaceToFinishConfig({ config, setConfig, cardCount, onStart, onExit }: Props) {
  const directionBtn = (value: AnswerDirection, label: string) => (
    <button
      type="button"
      onClick={() => setConfig((c) => ({ ...c, answerDirection: value }))}
      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
        config.answerDirection === value
          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
          : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-primary-muted)]'
      }`}
    >
      {label}
    </button>
  );

  const pathPresets = [10, 15, 20, 30, 50, 75, 100];

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Race to Finish</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Answer questions, roll the dice, and race to the end!
        </p>
      </div>

      <div className="space-y-5">
        {/* Number of Players */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-text)]">Number of Players</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, playerCount: n }))}
                className={`flex-1 py-3 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  config.playerCount === n
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-primary-muted)]'
                }`}
              >
                <span className="block text-lg">{PLAYER_THEMES.slice(0, n).map((t) => t.emoji).join(' ')}</span>
                <span className="block mt-1">{n === 1 ? 'Solo' : `${n} Players`}</span>
              </button>
            ))}
          </div>
          {config.playerCount === 1 && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Solo mode — race to the finish on your own!
            </p>
          )}
        </div>

        {/* Path Length */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--color-text)]">Path Length</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfig((c) => ({ ...c, pathLength: Math.max(3, c.pathLength - 1) }))}
              className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-lg font-bold flex items-center justify-center hover:bg-[var(--color-primary-muted)] transition-colors"
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={config.pathLength}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                if (raw === '') {
                  setConfig((c) => ({ ...c, pathLength: 3 }));
                  return;
                }
                const v = parseInt(raw, 10);
                if (v >= 3) setConfig((c) => ({ ...c, pathLength: v }));
              }}
              className="w-20 h-9 text-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-lg font-bold tabular-nums"
            />
            <button
              type="button"
              onClick={() => setConfig((c) => ({ ...c, pathLength: c.pathLength + 1 }))}
              className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-lg font-bold flex items-center justify-center hover:bg-[var(--color-primary-muted)] transition-colors"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {pathPresets.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, pathLength: n }))}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  config.pathLength === n
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-primary-muted)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {config.pathLength <= 15 ? 'Quick game' : config.pathLength <= 30 ? 'Standard game' : 'Long game'}
            {config.pathLength >= 15 ? ' — shortcuts will appear on the board!' : ''}
          </p>
        </div>

        {/* Answer Direction */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-text)]">Answer with</label>
          <div className="flex gap-2">
            {directionBtn('term-to-definition', 'Definition')}
            {directionBtn('definition-to-term', 'Term')}
            {directionBtn('both', 'Both')}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {config.answerDirection === 'both'
              ? 'Questions will randomly ask for either term or definition'
              : `You'll be shown the ${config.answerDirection === 'term-to-definition' ? 'term' : 'definition'} and answer with the ${config.answerDirection === 'term-to-definition' ? 'definition' : 'term'}`}
          </p>
        </div>

        {/* Question Types */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-text)]">Question types</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.questionTypes.written}
              onChange={(e) =>
                setConfig((c) => ({ ...c, questionTypes: { ...c.questionTypes, written: e.target.checked } }))
              }
              className="accent-[var(--color-primary)]"
            />
            <span className="text-[var(--color-text)]">Written answers</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.questionTypes.multiple}
              onChange={(e) =>
                setConfig((c) => ({ ...c, questionTypes: { ...c.questionTypes, multiple: e.target.checked } }))
              }
              className="accent-[var(--color-primary)]"
            />
            <span className="text-[var(--color-text)]">Multiple choice</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.questionTypes.truefalse}
              onChange={(e) =>
                setConfig((c) => ({ ...c, questionTypes: { ...c.questionTypes, truefalse: e.target.checked } }))
              }
              className="accent-[var(--color-primary)]"
            />
            <span className="text-[var(--color-text)]">True / False</span>
          </label>
        </div>
      </div>

      {cardCount < 4 && (
        <p className="text-sm text-amber-500 text-center">
          You need at least 4 cards for multiple choice questions.
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={onStart} className="flex-1">
          Start Race
        </Button>
        <Button onClick={onExit} variant="ghost">
          Exit
        </Button>
      </div>
    </div>
  );
}
