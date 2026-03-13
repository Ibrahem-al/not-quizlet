import { motion } from 'framer-motion';
import { Button } from '../../ui';
import type { GameModeProps } from '../../../config/gameRegistry';
import { useRaceToFinish } from './race-to-finish/useRaceToFinish';
import { RaceToFinishConfig } from './race-to-finish/RaceToFinishConfig';
import { GameBoard } from './race-to-finish/GameBoard';
import { RaceQuestionPanel } from './race-to-finish/RaceQuestionPanel';
import { DiceRoll } from './race-to-finish/DiceRoll';
import { RaceToFinishResults } from './race-to-finish/RaceToFinishResults';

export default function RaceToFinishMode({ cards, onExit }: GameModeProps) {
  const {
    config,
    setConfig,
    gameState,
    currentQuestion,
    lastAnswerCorrect,
    startGame,
    submitWrittenAnswer,
    submitMultipleChoice,
    submitTrueFalse,
    onDiceRollComplete,
    onMoveComplete,
    resetGame,
  } = useRaceToFinish(cards);

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
        <RaceToFinishConfig
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
  if (gameState.phase === 'finished') {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <RaceToFinishResults
          gameState={gameState}
          onPlayAgain={resetGame}
          onExit={onExit}
        />
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  /* Playing */
  return (
    <div className="h-screen bg-[var(--color-background)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className={`flex items-center justify-between px-4 py-3 border-b-2 transition-colors ${currentPlayer.borderColor}`}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--color-text)]">Race to Finish</span>
          <div className="flex gap-1.5">
            {gameState.players.map((p) => (
              <div
                key={p.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  p.id === currentPlayer.id
                    ? `${p.bgColor} text-white shadow-lg scale-110 ring-2 ring-white`
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] opacity-50'
                }`}
              >
                <span className="text-sm">{p.emoji}</span>
              </div>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Exit
        </Button>
      </header>

      {/* Turn indicator bar */}
      <div className={`px-4 py-2 ${currentPlayer.bgColor} bg-opacity-10 border-b border-[var(--color-border)]`}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg">{currentPlayer.emoji}</span>
          <span className={`font-bold ${currentPlayer.color}`}>
            {gameState.players.length === 1 ? 'Your Turn' : `${currentPlayer.name}'s Turn`}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            — Cell {Math.max(1, currentPlayer.position + 2)} / {config.pathLength}
          </span>
        </div>
      </div>

      {/* Game area — always side-by-side so both panels are visible */}
      <div className="flex-1 flex gap-2 lg:gap-4 p-2 lg:p-4 min-h-0">
        {/* Board — vertical scroll only */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <GameBoard
            cells={gameState.boardCells}
            players={gameState.players}
            shortcuts={gameState.shortcuts}
            currentPlayerIndex={gameState.currentPlayerIndex}
            onMoveComplete={onMoveComplete}
            phase={gameState.phase}
            layoutSeed={gameState.layoutSeed}
            pendingMove={gameState.pendingMove}
          />
        </div>

        {/* Right panel: Question / Dice — independent scroll */}
        <div className="flex-1 min-w-0 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {gameState.phase === 'question' && currentQuestion && (
            <RaceQuestionPanel
              question={currentQuestion}
              playerName={currentPlayer.name}
              playerEmoji={currentPlayer.emoji}
              playerColor={currentPlayer.color}
              isSolo={gameState.players.length === 1}
              lastAnswerCorrect={lastAnswerCorrect}
              onSubmitWritten={submitWrittenAnswer}
              onSubmitMultiple={submitMultipleChoice}
              onSubmitTrueFalse={submitTrueFalse}
            />
          )}

          {gameState.phase === 'rolling' && (
            <DiceRoll
              onRollComplete={onDiceRollComplete}
              playerColor={currentPlayer.color}
              playerEmoji={currentPlayer.emoji}
              playerName={currentPlayer.name}
            />
          )}

          {gameState.phase === 'moving' && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
              <motion.span
                className="text-5xl"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {currentPlayer.emoji}
              </motion.span>
              <p className={`text-xl font-bold ${currentPlayer.color}`}>
                Moving {gameState.diceValue} space{gameState.diceValue !== 1 ? 's' : ''}!
              </p>
              {gameState.pendingMove?.shortcutTo !== undefined && (
                <p className="text-sm text-cyan-500 font-medium animate-pulse">
                  ⚡ Shortcut ahead!
                </p>
              )}
              <p className="text-sm text-[var(--color-text-secondary)]">
                Watch the board...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
