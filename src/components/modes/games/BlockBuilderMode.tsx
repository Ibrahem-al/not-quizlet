import { Button } from '../../ui';
import type { GameModeProps } from '../../../config/gameRegistry';
import { useBlockBuilderGame } from './block-builder/useBlockBuilderGame';
import { BlockBuilderConfigScreen } from './block-builder/BlockBuilderConfig';
import { TowerView } from './block-builder/TowerView';
import { QuestionPanel } from './block-builder/QuestionPanel';
import { BlockBuilderResults } from './block-builder/BlockBuilderResults';

export default function BlockBuilderMode({ cards, onExit }: GameModeProps) {
  const {
    config,
    setConfig,
    gameState,
    currentQuestion,
    questions,
    startGame,
    submitWrittenAnswer,
    submitMultipleChoice,
    submitTrueFalse,
    resetGame,
  } = useBlockBuilderGame(cards);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-[var(--color-text-secondary)]">No cards available.</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }

  /* Config screen */
  if (gameState.phase === 'config') {
    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <BlockBuilderConfigScreen
          config={config}
          setConfig={setConfig}
          cardCount={cards.length}
          onStart={startGame}
          onExit={onExit}
        />
      </div>
    );
  }

  /* Results screen */
  if (gameState.phase === 'won' || gameState.phase === 'lost') {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <BlockBuilderResults
          gameState={gameState}
          config={config}
          onPlayAgain={resetGame}
          onExit={onExit}
        />
      </div>
    );
  }

  /* Playing */
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <span className="text-sm font-semibold text-[var(--color-text)]">Block Builder</span>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Exit
        </Button>
      </header>

      {/* Game area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-0 md:gap-4 p-2 md:p-4 overflow-hidden">
        {/* Tower */}
        <div className="flex items-end justify-center md:items-center pb-2 md:pb-0">
          <TowerView
            blocks={gameState.blocks}
            lavaHeight={gameState.lavaHeight}
            lastAnswerCorrect={gameState.lastAnswerCorrect}
            score={gameState.score}
            difficulty={config.difficulty}
            streak={gameState.streak}
            totalQuestions={config.infinityMode ? null : questions.length}
            phase={gameState.phase}
          />
        </div>

        {/* Questions */}
        <div className="min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {currentQuestion ? (
            <QuestionPanel
              question={currentQuestion}
              questionIndex={gameState.currentQuestionIndex}
              totalAnswered={gameState.questionsAnswered}
              totalQuestions={config.infinityMode ? null : questions.length}
              lastAnswerCorrect={gameState.lastAnswerCorrect}
              onSubmitWritten={submitWrittenAnswer}
              onSubmitMultiple={submitMultipleChoice}
              onSubmitTrueFalse={submitTrueFalse}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--color-text-secondary)]">Loading...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
