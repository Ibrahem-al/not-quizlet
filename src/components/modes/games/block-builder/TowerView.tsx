import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BLOCK_HEIGHT_PX, TOWER_CONTAINER_HEIGHT } from './types';
import type { Difficulty, GamePhase } from './types';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface TowerViewProps {
  blocks: number;
  lavaHeight: number;
  lastAnswerCorrect: boolean | null;
  score: number;
  difficulty: Difficulty;
  streak: number;
  /** null = infinity mode (no summit) */
  totalQuestions: number | null;
  phase: GamePhase;
}

function blockColor(index: number): string {
  const hue = (200 + index * 18) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

function blockShadowColor(index: number): string {
  const hue = (200 + index * 18) % 360;
  return `hsl(${hue}, 65%, 40%)`;
}

/** Jagged mountain ridge SVG — creates a realistic rocky silhouette */
function MountainRidge({ y, color, opacity, seed }: { y: number; color: string; opacity: number; seed: number }) {
  // Generate a jagged ridge line using the seed for variation
  const points: string[] = ['0,80'];
  const segments = 12;
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * 400;
    // Pseudo-random peaks using seed
    const peak = 20 + ((seed * (i + 1) * 7) % 50);
    const yPos = i % 2 === 0 ? 80 - peak : 80 - peak * 0.5;
    points.push(`${x},${yPos}`);
  }
  points.push('400,80');

  return (
    <div
      className="absolute left-0 right-0"
      style={{ bottom: y, height: 80, opacity }}
    >
      <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="w-full h-full">
        <polygon points={points.join(' ')} fill={color} />
      </svg>
    </div>
  );
}

/** Small rock/cliff detail on the sides */
function RockShelf({ y, side, width }: { y: number; side: 'left' | 'right'; width: number }) {
  return (
    <div
      className="absolute"
      style={{
        bottom: y,
        [side]: 0,
        width,
        height: 16,
      }}
    >
      <div
        className="w-full h-full rounded-t-sm"
        style={{
          background: 'linear-gradient(to top, #5c4033, #7a5c47)',
          opacity: 0.5,
          borderRadius: side === 'left' ? '0 8px 0 0' : '8px 0 0 0',
        }}
      />
    </div>
  );
}

export function TowerView({ blocks, lavaHeight, lastAnswerCorrect, score, difficulty, streak, totalQuestions, phase }: TowerViewProps) {
  const VIEWPORT = TOWER_CONTAINER_HEIGHT;
  const CHARACTER_HEIGHT = 44;
  const towerTopPx = blocks * BLOCK_HEIGHT_PX;

  const summitPx = totalQuestions !== null ? (3 + totalQuestions) * BLOCK_HEIGHT_PX : null;

  const characterWorldY = towerTopPx + CHARACTER_HEIGHT;
  const targetViewY = VIEWPORT * 0.6;
  const cameraY = Math.max(0, characterWorldY - targetViewY);

  const lavaWorldY = lavaHeight;

  const worldHeight = Math.max(VIEWPORT * 3, (summitPx ?? 2000) + VIEWPORT);

  // Generate mountain ridges at different depths
  const mountainLayers = useMemo(() => {
    const layers: { y: number; color: string; opacity: number; seed: number }[] = [];
    const maxH = summitPx ?? Math.max(towerTopPx + 600, 2000);

    // Back layer — darker, wider ridges
    for (let h = 0; h < maxH; h += 200) {
      layers.push({ y: h, color: '#2d3748', opacity: 0.25, seed: h + 1 });
    }
    // Mid layer — medium tones
    for (let h = 80; h < maxH; h += 250) {
      layers.push({ y: h, color: '#4a5568', opacity: 0.2, seed: h + 37 });
    }
    return layers;
  }, [summitPx, towerTopPx]);

  // Rock shelves on the sides for depth
  const rockShelves = useMemo(() => {
    const shelves: { y: number; side: 'left' | 'right'; width: number }[] = [];
    const maxH = summitPx ?? Math.max(towerTopPx + 600, 2000);
    for (let h = 60; h < maxH; h += 120) {
      const side = h % 240 < 120 ? 'left' : 'right';
      const width = 20 + ((h * 3) % 30);
      shelves.push({ y: h, side, width });
    }
    return shelves;
  }, [summitPx, towerTopPx]);

  // Altitude markers
  const altMarkers = useMemo(() => {
    const maxH = summitPx ?? Math.max(towerTopPx + 400, 2000);
    const markers = [];
    for (let h = 200; h < maxH; h += 300) {
      markers.push(h);
    }
    return markers;
  }, [summitPx, towerTopPx]);

  const progressPct = summitPx ? Math.min(100, Math.round((towerTopPx / summitPx) * 100)) : null;

  const isWon = phase === 'won';

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* HUD */}
      <div className="w-full flex items-center justify-between px-3 py-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Score</span>
          <motion.span
            key={score}
            initial={{ scale: 1.3, color: '#facc15' }}
            animate={{ scale: 1, color: 'var(--color-text)' }}
            className="text-lg font-bold tabular-nums"
          >
            {score}
          </motion.span>
        </div>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-sm font-bold text-orange-400"
            >
              {streak}x streak
            </motion.span>
          )}
          {progressPct !== null && (
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {progressPct}%
            </span>
          )}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            difficulty === 'easy' ? 'bg-green-500/20 text-green-500' :
            difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
            'bg-red-500/20 text-red-500'
          }`}>
            {difficulty}
          </span>
        </div>
      </div>

      {/* Viewport */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-[var(--color-border)]"
        style={{ height: VIEWPORT }}
      >
        {/* World container — translated by camera */}
        <motion.div
          className="absolute left-0 right-0"
          style={{ bottom: 0 }}
          animate={{ y: cameraY }}
          transition={{ type: 'spring', stiffness: 120, damping: 24 }}
        >
          {/* Sky + Mountain background */}
          <div
            className="absolute left-0 right-0"
            style={{ bottom: 0, height: worldHeight }}
          >
            {/* Sky gradient — transitions from warm base to cold peak */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, #1a1a2e 0%, #16213e 15%, #0f3460 30%, #533483 45%, #e94560 55%, #f5a623 65%, #87ceeb 78%, #b0d4e8 90%, #d4e4bc 100%)',
              }}
            />
            {/* Dark mode overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent dark:from-black/60 dark:via-black/40 dark:to-black/10" />

            {/* Mountain ridge silhouettes */}
            {mountainLayers.map((layer, i) => (
              <MountainRidge key={i} {...layer} />
            ))}

            {/* Rock shelves on edges */}
            {rockShelves.map((shelf, i) => (
              <RockShelf key={`shelf-${i}`} {...shelf} />
            ))}

            {/* Altitude markers */}
            {altMarkers.map((h, i) => (
              <div
                key={`alt-${i}`}
                className="absolute left-2 text-[10px] font-mono text-white/25 dark:text-white/15"
                style={{ bottom: h }}
              >
                {Math.round(h / BLOCK_HEIGHT_PX)}m
              </div>
            ))}

            {/* Snow zone near summit */}
            {summitPx && (
              <>
                {/* Snow gradient overlay */}
                <div
                  className="absolute left-0 right-0"
                  style={{
                    bottom: summitPx - 120,
                    height: 160,
                    background: 'linear-gradient(to top, transparent 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.35) 100%)',
                  }}
                />
                {/* Snow cap at summit */}
                <div
                  className="absolute left-0 right-0 h-8"
                  style={{
                    bottom: summitPx + 30,
                    background: 'linear-gradient(to top, rgba(255,255,255,0.3), rgba(255,255,255,0.5))',
                  }}
                />
                {/* Snowflake decorations */}
                <div className="absolute text-[8px] text-white/40" style={{ bottom: summitPx - 30, left: '20%' }}>*</div>
                <div className="absolute text-[8px] text-white/30" style={{ bottom: summitPx - 60, left: '70%' }}>*</div>
                <div className="absolute text-[8px] text-white/35" style={{ bottom: summitPx - 10, left: '45%' }}>*</div>
              </>
            )}
          </div>

          {/* Helicopter at summit (replaces flag) */}
          {summitPx && (
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
              style={{ bottom: summitPx + 4 }}
              animate={isWon
                ? { y: [0, -10, -300], x: [0, 0, 150], opacity: [1, 1, 0] }
                : { y: [0, -4, 0] }
              }
              transition={isWon
                ? { duration: 2.5, ease: 'easeInOut', times: [0, 0.3, 1] }
                : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <div className="text-3xl" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' }}>
                🚁
              </div>
              <div className="text-[9px] font-bold text-white bg-black/50 rounded px-1.5 py-0.5 whitespace-nowrap mt-0.5">
                Summit
              </div>
            </motion.div>
          )}

          {/* Lava */}
          <div
            className="absolute bottom-0 left-0 right-0 z-10"
            style={{ height: Math.max(0, lavaWorldY) }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-red-700 via-orange-500 to-yellow-400" />
            <div
              className="absolute top-0 left-0 right-0 h-3"
              style={{ boxShadow: '0 -6px 24px rgba(255, 100, 0, 0.6)' }}
            />
            <div className="absolute -top-2 left-0 right-0 h-4 overflow-hidden">
              <div className="absolute w-[200%] h-full" style={{
                background: 'linear-gradient(to top, rgba(250, 204, 21, 0.9), transparent)',
                borderRadius: '40% 60% 50% 50% / 100% 100% 0% 0%',
                animation: 'lavaWave 2s ease-in-out infinite alternate',
              }} />
            </div>
            <div className="absolute top-1 left-[20%] w-2 h-2 rounded-full bg-yellow-300/60" style={{ animation: 'lavaBubble 1.5s ease-in-out infinite' }} />
            <div className="absolute top-2 left-[60%] w-1.5 h-1.5 rounded-full bg-yellow-300/50" style={{ animation: 'lavaBubble 2s ease-in-out 0.5s infinite' }} />
            <div className="absolute top-1 left-[80%] w-2.5 h-2.5 rounded-full bg-orange-300/40" style={{ animation: 'lavaBubble 1.8s ease-in-out 1s infinite' }} />
          </div>

          {/* Tower + Character */}
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center">
            {/* Character on top of tower */}
            <motion.div
              animate={
                isWon
                  ? { y: [0, -20, -200], x: [0, 0, 100], opacity: [1, 1, 0], scale: [1, 1.1, 0.6] }
                  : lastAnswerCorrect === true
                  ? { y: [0, -12, 0] }
                  : lastAnswerCorrect === false
                  ? { x: [0, -6, 6, -6, 6, 0] }
                  : {}
              }
              transition={isWon
                ? { duration: 2.5, ease: 'easeInOut', times: [0, 0.3, 1], delay: 0.3 }
                : { duration: 0.4 }
              }
              className="relative z-30 text-3xl leading-none mb-0.5"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            >
              🧱👷
            </motion.div>

            {/* Blocks stack */}
            <div className="flex flex-col-reverse items-center">
              <AnimatePresence>
                {Array.from({ length: blocks }, (_, i) => (
                  <motion.div
                    key={`block-${i}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, x: 40, opacity: 0 }}
                    transition={spring}
                    className="rounded-lg border border-white/20"
                    style={{
                      width: 72,
                      height: BLOCK_HEIGHT_PX,
                      backgroundColor: blockColor(i),
                      boxShadow: `inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 ${blockShadowColor(i)}, 0 2px 4px rgba(0,0,0,0.15)`,
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Ground — rocky mountain base */}
          <div className="absolute bottom-0 left-0 right-0 z-[5]">
            {/* Rocky ground */}
            <div className="h-4" style={{ background: 'linear-gradient(to top, #3d2b1f, #5c4033, #6b4c3b)' }} />
            {/* Grass and rocks */}
            <div className="absolute -top-1.5 left-[10%] text-[10px]">🪨</div>
            <div className="absolute -top-1 left-[30%] text-xs">🌿</div>
            <div className="absolute -top-1.5 left-[55%] text-[10px]">🪨</div>
            <div className="absolute -top-1 left-[75%] text-xs">🌱</div>
            <div className="absolute -top-1.5 left-[90%] text-[10px]">🪨</div>
          </div>
        </motion.div>

        {/* Altitude progress bar (fixed in viewport, right edge) */}
        {summitPx && (
          <div className="absolute right-2 top-4 bottom-4 w-1.5 rounded-full bg-white/10 dark:bg-white/5 z-40 overflow-hidden">
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-orange-500 to-sky-400"
              animate={{ height: `${progressPct}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-sky-400 z-10"
              animate={{ bottom: `${progressPct}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              style={{ marginBottom: -6 }}
            />
          </div>
        )}

        {/* Vignette overlay at top for depth */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent z-30 pointer-events-none" />
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes lavaWave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
        @keyframes lavaBubble {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-8px) scale(1.2); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
