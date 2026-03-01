import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  running: boolean;
  className?: string;
}

export function Timer({ running, className = '' }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed;
      const tick = () => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 10) * 10);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const ms = elapsed % 1000;
  const totalSeconds = Math.floor(elapsed / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const display = `${pad(minutes)}:${pad(seconds)}.${Math.floor(ms / 100)
    .toString()
    .padStart(1, '0')}`;

  return (
    <span
      className={`font-mono text-[var(--color-text)] ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {display}
    </span>
  );
}
