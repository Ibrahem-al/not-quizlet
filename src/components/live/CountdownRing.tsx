interface CountdownRingProps {
  totalMs: number;
  remainingMs: number;
  size?: number;
}

export function CountdownRing({ totalMs, remainingMs, size = 80 }: CountdownRingProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
  const strokeDashoffset = circumference * (1 - progress);
  const seconds = Math.ceil(remainingMs / 1000);

  const color = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#eab308' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span
        className="absolute text-lg font-bold tabular-nums"
        style={{ color }}
      >
        {seconds}
      </span>
    </div>
  );
}
