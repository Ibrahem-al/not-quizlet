import { Button } from '../../../ui';
import type { BlockBuilderConfig as Config, AnswerDirection, Difficulty } from './types';

interface BlockBuilderConfigProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  cardCount: number;
  onStart: () => void;
  onExit: () => void;
}

export function BlockBuilderConfigScreen({ config, setConfig, cardCount, onStart, onExit }: BlockBuilderConfigProps) {
  const maxQuestions = Math.max(cardCount * 3, 50);
  const presets = [5, 10, 20, cardCount, Math.min(cardCount * 2, maxQuestions)].filter(
    (v, i, a) => v >= 1 && v <= maxQuestions && a.indexOf(v) === i,
  );

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

  const difficultyBtn = (value: Difficulty, label: string, colorClass: string) => (
    <button
      type="button"
      onClick={() => setConfig((c) => ({ ...c, difficulty: value }))}
      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
        config.difficulty === value
          ? `${colorClass} text-white border-transparent`
          : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-primary-muted)]'
      }`}
    >
      <span className="block">{label}</span>
    </button>
  );

  const difficultyDescriptions: Record<Difficulty, string> = {
    easy: 'No block penalty for wrong answers. Constant lava speed.',
    medium: 'Lose 1 block per wrong answer. Lava speeds up over time.',
    hard: 'Lose 2 blocks per wrong answer. Lava speeds up fast.',
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Block Builder</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Answer questions to build your tower. Stay above the rising lava!
        </p>
      </div>

      <div className="space-y-5">
        {/* Difficulty */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-text)]">Difficulty</label>
          <div className="flex gap-2">
            {difficultyBtn('easy', 'Easy', 'bg-green-500')}
            {difficultyBtn('medium', 'Medium', 'bg-yellow-500')}
            {difficultyBtn('hard', 'Hard', 'bg-red-500')}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {difficultyDescriptions[config.difficulty]}
          </p>
        </div>

        {/* Infinity mode */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              role="switch"
              aria-checked={config.infinityMode}
              onClick={() => setConfig((c) => ({ ...c, infinityMode: !c.infinityMode }))}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                config.infinityMode ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${
                  config.infinityMode ? 'translate-x-5' : ''
                }`}
              />
            </div>
            <span className="text-sm font-medium text-[var(--color-text)]">Infinity Mode</span>
          </label>
          {config.infinityMode && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Play endlessly for the highest score. Lose 1 block per wrong answer regardless of difficulty.
            </p>
          )}
        </div>

        {/* Answer direction */}
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

        {/* Question types */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-text)]">Question types</label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.questionTypes.written}
              onChange={(e) =>
                setConfig((c) => ({ ...c, questionTypes: { ...c.questionTypes, written: e.target.checked } }))
              }
            />
            <span className="text-[var(--color-text)]">Written answers</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.questionTypes.multiple}
              onChange={(e) =>
                setConfig((c) => ({ ...c, questionTypes: { ...c.questionTypes, multiple: e.target.checked } }))
              }
            />
            <span className="text-[var(--color-text)]">Multiple choice</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.questionTypes.truefalse}
              onChange={(e) =>
                setConfig((c) => ({ ...c, questionTypes: { ...c.questionTypes, truefalse: e.target.checked } }))
              }
            />
            <span className="text-[var(--color-text)]">True / False</span>
          </label>
        </div>

        {/* Question count (hidden when infinity) */}
        {!config.infinityMode && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--color-text)]">Number of questions</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, questionCount: Math.max(1, c.questionCount - 1) }))}
                className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-lg font-bold flex items-center justify-center hover:bg-[var(--color-primary-muted)] transition-colors"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={config.questionCount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  if (raw === '') {
                    setConfig((c) => ({ ...c, questionCount: 1 }));
                    return;
                  }
                  const v = Math.min(parseInt(raw, 10), maxQuestions);
                  if (v >= 1) setConfig((c) => ({ ...c, questionCount: v }));
                }}
                className="w-20 h-9 text-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-lg font-bold tabular-nums"
              />
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, questionCount: Math.min(maxQuestions, c.questionCount + 1) }))}
                className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-lg font-bold flex items-center justify-center hover:bg-[var(--color-primary-muted)] transition-colors"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, questionCount: n }))}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    config.questionCount === n
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-primary-muted)]'
                  }`}
                >
                  {n === cardCount ? `All (${n})` : n}
                </button>
              ))}
            </div>
            {config.questionCount > cardCount && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Cards will repeat evenly — each card appears at least{' '}
                {Math.floor(config.questionCount / cardCount)} time
                {Math.floor(config.questionCount / cardCount) !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={onStart} className="flex-1">
          Start Game
        </Button>
        <Button onClick={onExit} variant="ghost">
          Exit
        </Button>
      </div>
    </div>
  );
}
