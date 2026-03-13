import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { BoardCell, Player, Shortcut, PendingMove } from './types';

interface GameBoardProps {
  cells: BoardCell[];
  players: Player[];
  shortcuts: Shortcut[];
  currentPlayerIndex: number;
  onMoveComplete?: () => void;
  phase: string;
  layoutSeed: number;
  pendingMove: PendingMove | null;
}

/* ── seeded RNG for deterministic random layouts ── */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── path node sizing ── */
const NODE_R = 26;
const NODE_DIAMETER = NODE_R * 2;
const SPACING = 90;
const PADDING = 60;
const ROAD_WIDTH = 18;

interface PathNode { x: number; y: number }

function generatePath(count: number, seed: number, canvasW: number): PathNode[] {
  const rng = mulberry32(seed);
  const nodes: PathNode[] = [];
  const maxCols = Math.max(3, Math.floor((canvasW - PADDING * 2) / SPACING));

  let x = PADDING + NODE_R;
  let y = PADDING + NODE_R;
  let dir = 1;

  for (let i = 0; i < count; i++) {
    const jitterY = (rng() - 0.5) * 24;
    const jitterX = (rng() - 0.5) * 14;
    nodes.push({ x: x + jitterX, y: y + jitterY });

    if (i === count - 1) break;

    const nextX = x + dir * SPACING;
    const leftBound = PADDING + NODE_R;
    const rightBound = PADDING + NODE_R + (maxCols - 1) * SPACING;

    if (nextX < leftBound || nextX > rightBound) {
      y += SPACING * (0.7 + rng() * 0.6);
      dir *= -1;
    } else {
      x = nextX;
    }
  }
  return nodes;
}

function buildSmoothPath(nodes: PathNode[]): string {
  if (nodes.length < 2) return '';
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cpx2 = curr.x - (curr.x - prev.x) * 0.5;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

/* ── hop delay per cell (ms) ── */
const HOP_DELAY = 350;
const SHORTCUT_DELAY = 500;
const SCROLL_MARGIN = 80; // px from viewport edge before we scroll

/** Check if a Y coordinate is within the visible scroll viewport (vertical only) */
function isYInView(el: HTMLElement, y: number, margin: number): boolean {
  const st = el.scrollTop;
  const vh = el.clientHeight;
  return y >= st + margin && y <= st + vh - margin;
}

export function GameBoard({
  cells,
  players,
  shortcuts,
  currentPlayerIndex,
  onMoveComplete,
  phase,
  layoutSeed,
  pendingMove,
}: GameBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const moveCompleteRef = useRef(onMoveComplete);
  moveCompleteRef.current = onMoveComplete;
  const [containerW, setContainerW] = useState(800);

  // ── Animated position overrides for the moving player ──
  // Maps playerId → current visual position (cell index)
  const [animPositions, setAnimPositions] = useState<Record<number, number>>({});
  // Track if shortcut animation is playing
  const [showingShortcut, setShowingShortcut] = useState(false);

  // Measure container
  useEffect(() => {
    if (!scrollRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(Math.max(500, entry.contentRect.width - 32));
    });
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  const nodes = useMemo(
    () => generatePath(cells.length, layoutSeed, containerW),
    [cells.length, layoutSeed, containerW],
  );

  // Canvas width = container width (no horizontal scroll)
  const canvasW = containerW;
  const canvasH = useMemo(
    () => Math.max(300, ...nodes.map((n) => n.y)) + PADDING + NODE_R + 30,
    [nodes],
  );

  const roadPath = useMemo(() => buildSmoothPath(nodes), [nodes]);

  // ── Smooth vertical scroll only when character is near/past viewport edge ──
  const scrollToNodeIfNeeded = useCallback(
    (nodeIdx: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const node = nodes[nodeIdx];
      if (!node) return;

      if (!isYInView(el, node.y, SCROLL_MARGIN)) {
        el.scrollTo({
          top: Math.max(0, node.y - el.clientHeight / 2),
          behavior: 'smooth',
        });
      }
    },
    [nodes],
  );

  // ── Step-by-step hop animation ──
  useEffect(() => {
    if (phase !== 'moving' || !pendingMove) return;

    const { playerId, fromPos, toPos, shortcutTo } = pendingMove;

    // Build sequence of positions to visit: fromPos+1, fromPos+2, ..., toPos
    const startCell = Math.max(0, fromPos); // -1 means before start, clamp to 0
    const stepsToAnimate: number[] = [];
    for (let p = startCell + 1; p <= toPos; p++) {
      stepsToAnimate.push(p);
    }
    // If from was -1 (before start), also include cell 0
    if (fromPos < 0) {
      stepsToAnimate.unshift(0);
    }

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Start at current position
    setAnimPositions((prev) => ({ ...prev, [playerId]: Math.max(0, fromPos) }));

    // Hop through each cell
    stepsToAnimate.forEach((cellIdx, i) => {
      const t = setTimeout(() => {
        if (cancelled) return;
        setAnimPositions((prev) => ({ ...prev, [playerId]: cellIdx }));
        scrollToNodeIfNeeded(cellIdx);
      }, (i + 1) * HOP_DELAY);
      timeouts.push(t);
    });

    // After all hops, handle shortcut
    const afterHops = stepsToAnimate.length * HOP_DELAY + HOP_DELAY;

    if (shortcutTo !== undefined) {
      const t1 = setTimeout(() => {
        if (cancelled) return;
        setShowingShortcut(true);
      }, afterHops);
      timeouts.push(t1);

      const t2 = setTimeout(() => {
        if (cancelled) return;
        setAnimPositions((prev) => ({ ...prev, [playerId]: shortcutTo }));
        scrollToNodeIfNeeded(shortcutTo);
      }, afterHops + 200);
      timeouts.push(t2);

      const t3 = setTimeout(() => {
        if (cancelled) return;
        setShowingShortcut(false);
        setAnimPositions((prev) => {
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
        moveCompleteRef.current?.();
      }, afterHops + 200 + SHORTCUT_DELAY);
      timeouts.push(t3);
    } else {
      const t = setTimeout(() => {
        if (cancelled) return;
        setAnimPositions((prev) => {
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
        moveCompleteRef.current?.();
      }, afterHops);
      timeouts.push(t);
    }

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [phase, pendingMove, scrollToNodeIfNeeded]);

  // Scroll to current player on turn change (not during animation)
  useEffect(() => {
    if (phase === 'moving') return; // animation handles its own scrolling
    const cp = players[currentPlayerIndex];
    if (!cp || cp.position < 0) return;
    const el = scrollRef.current;
    const node = nodes[cp.position];
    if (!el || !node) return;
    el.scrollTo({
      top: Math.max(0, node.y - el.clientHeight / 2),
      behavior: 'smooth',
    });
  }, [currentPlayerIndex, phase, players, nodes]);

  // Get the visual position for a player (animated or real)
  const getVisualPosition = useCallback(
    (player: Player) => {
      if (animPositions[player.id] !== undefined) return animPositions[player.id];
      return player.position;
    },
    [animPositions],
  );

  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  return (
    <div ref={scrollRef} className="w-full h-full overflow-y-auto overflow-x-hidden">
      <div className="relative w-full" style={{ minHeight: canvasH }}>
        {/* SVG layer — road + shortcuts */}
        <svg
          className="absolute inset-0 pointer-events-none w-full"
          height={canvasH}
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          preserveAspectRatio="xMidYMin meet"
          style={{ overflow: 'visible' }}
        >
          {/* Road shadow */}
          <path
            d={roadPath}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={ROAD_WIDTH + 6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.3}
          />
          {/* Road fill */}
          <path
            d={roadPath}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={ROAD_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.5}
          />
          {/* Road centre dashes */}
          <path
            d={roadPath}
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth={2}
            strokeDasharray="8 12"
            strokeLinecap="round"
            opacity={0.6}
          />

          {/* Shortcut arcs */}
          {shortcuts.map((s, i) => {
            const from = nodes[s.from];
            const to = nodes[s.to];
            if (!from || !to) return null;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const cx = (from.x + to.x) / 2 - dy * 0.35;
            const cy = (from.y + to.y) / 2 + dx * 0.35;

            return (
              <g key={`sc-${i}`}>
                <path
                  d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                  fill="none"
                  stroke="rgb(6, 182, 212)"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  opacity={0.7}
                />
                <circle cx={to.x} cy={to.y} r={5} fill="rgb(6, 182, 212)" opacity={0.5} />
              </g>
            );
          })}
        </svg>

        {/* Path nodes (cells) */}
        {cells.map((cell, i) => {
          const node = nodes[i];
          if (!node) return null;
          const isStart = i === 0;
          const isEnd = i === cells.length - 1;
          const hasShortcut = cell.shortcutTo !== undefined;
          const isHovered = hoveredCell === i;

          // Highlight the cell the player is hopping onto
          const isBeingLandedOn =
            pendingMove && animPositions[pendingMove.playerId] === i;

          let bgClass = 'bg-[var(--color-surface)] border-[var(--color-border)]';
          let ringClass = '';
          if (isStart) {
            bgClass = 'bg-green-500 border-green-600';
            ringClass = 'ring-2 ring-green-400/40';
          } else if (isEnd) {
            bgClass = 'bg-amber-500 border-amber-600';
            ringClass = 'ring-2 ring-amber-400/40';
          } else if (hasShortcut) {
            bgClass = 'bg-cyan-100 border-cyan-400 dark:bg-cyan-900 dark:border-cyan-500';
          }

          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: node.x - NODE_R,
                top: node.y - NODE_R,
                width: NODE_DIAMETER,
                height: NODE_DIAMETER,
              }}
            >
              {/* The circle node */}
              <motion.div
                className={`
                  w-full h-full rounded-full border-2 flex flex-col items-center justify-center
                  cursor-pointer shadow-md ${bgClass} ${ringClass}
                `}
                animate={
                  isBeingLandedOn
                    ? { scale: [1, 1.2, 1], transition: { duration: 0.25 } }
                    : { scale: 1 }
                }
                whileHover={{ scale: 1.1 }}
                onMouseEnter={() => setHoveredCell(i)}
                onMouseLeave={() => setHoveredCell(null)}
              >
                {isStart ? (
                  <span className="text-white text-[10px] font-bold">GO</span>
                ) : isEnd ? (
                  <span className="text-white text-xs">🏁</span>
                ) : hasShortcut ? (
                  <span className="text-cyan-700 dark:text-cyan-300 text-[10px] font-bold">⚡</span>
                ) : (
                  <span className="text-[var(--color-text)] text-[10px] font-bold tabular-nums">{i + 1}</span>
                )}
                <span
                  className={`text-[6px] uppercase tracking-wider font-bold leading-none ${
                    isStart || isEnd ? 'text-white/70' : cell.label === 'Term' ? 'text-blue-500' : 'text-purple-500'
                  }`}
                >
                  {!isStart && !isEnd && cell.label}
                </span>
              </motion.div>

              {/* Tooltip on hover */}
              {isHovered && !isStart && !isEnd && (
                <div className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl pointer-events-none">
                  <p className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${
                    cell.label === 'Term' ? 'text-blue-500' : 'text-purple-500'
                  }`}>
                    {cell.label} — Cell {i + 1}
                    {hasShortcut && <span className="text-cyan-500 ml-1">⚡→{(cell.shortcutTo ?? 0) + 1}</span>}
                  </p>
                  <div
                    className="text-xs text-[var(--color-text)] study-content line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: cell.content }}
                  />
                </div>
              )}

              {/* Players rendered separately below as floating tokens */}
            </div>
          );
        })}

        {/* ── Floating player tokens — smoothly animated between nodes ── */}
        {players.map((player, pIdx) => {
          const visualPos = getVisualPosition(player);
          if (visualPos < 0) return null; // waiting at start — handled below
          const node = nodes[visualPos];
          if (!node) return null;

          const isMoving =
            pendingMove?.playerId === player.id &&
            animPositions[player.id] !== undefined;

          // Offset multiple players on the same cell so they don't overlap
          const sameCell = players.filter((p) => getVisualPosition(p) === visualPos);
          const orderInCell = sameCell.indexOf(player);
          const offsetX = sameCell.length > 1 ? (orderInCell - (sameCell.length - 1) / 2) * 20 : 0;

          // Position token centered on the cell, offset upward so it sits on top edge
          const tokenX = node.x - 16 + offsetX;
          const tokenY = node.y - NODE_R - 12;

          return (
            <motion.div
              key={`token-${player.id}`}
              className={`absolute z-20 w-8 h-8 rounded-full ${player.bgColor} flex items-center justify-center shadow-lg border-2 border-white`}
              animate={{
                left: tokenX,
                top: tokenY,
                scale: isMoving ? [1, 1.15, 1] : 1,
              }}
              transition={
                isMoving
                  ? { left: { type: 'spring', stiffness: 170, damping: 20 }, top: { type: 'spring', stiffness: 170, damping: 20 }, scale: { duration: 0.3, ease: 'easeOut' } }
                  : { type: 'spring', stiffness: 200, damping: 22 }
              }
              style={{
                left: tokenX,
                top: tokenY,
              }}
            >
              <span className="text-sm">{player.emoji}</span>
            </motion.div>
          );
        })}

        {/* Players waiting to start (position === -1 and not animating) */}
        {players.some((p) => p.position < 0 && animPositions[p.id] === undefined) && nodes[0] && (
          <div
            className="absolute flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm z-20"
            style={{ left: nodes[0].x - NODE_R, top: nodes[0].y - NODE_R - 36 }}
          >
            <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">Start</span>
            {players
              .filter((p) => p.position < 0 && animPositions[p.id] === undefined)
              .map((player) => (
                <div
                  key={player.id}
                  className={`w-7 h-7 rounded-full ${player.bgColor} flex items-center justify-center shadow-md border-2 border-white`}
                >
                  <span className="text-xs">{player.emoji}</span>
                </div>
              ))}
          </div>
        )}

        {/* Shortcut flash overlay */}
        {showingShortcut && pendingMove?.shortcutTo !== undefined && (
          <motion.div
            className="absolute inset-0 z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 0.4 }}
            style={{ background: 'rgb(6, 182, 212)' }}
          />
        )}
      </div>

      {/* Shortcut legend */}
      {shortcuts.length > 0 && (
        <div className="sticky bottom-0 left-0 flex flex-wrap gap-2 p-3 bg-[var(--color-surface)]/80 backdrop-blur-sm border-t border-[var(--color-border)]">
          <span className="text-[10px] text-[var(--color-text-secondary)] font-medium self-center">Shortcuts:</span>
          {shortcuts.map((s, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 border border-cyan-500/20"
            >
              ⚡ {s.from + 1} → {s.to + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
