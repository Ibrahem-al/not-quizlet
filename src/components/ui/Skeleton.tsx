import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animate?: boolean;
}

export function Skeleton({
  className = '',
  width,
  height,
  variant = 'text',
  animate = true,
}: SkeletonProps) {
  const baseClasses = 'bg-[var(--color-text-muted)]/20';
  
  const variantClasses = {
    text: 'rounded-[var(--radius-sm)]',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-[var(--radius-md)]',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  if (!animate) {
    return (
      <div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={style}
      />
    );
  }

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      animate={{
        opacity: [0.4, 0.8, 0.4],
      }}
      transition={{
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'loop',
      }}
    />
  );
}

// Preset skeleton components for common patterns
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 ${className}`}>
      <Skeleton variant="rounded" width="75%" height={20} className="mb-4" />
      <Skeleton variant="text" width="100%" height={14} className="mb-2" />
      <Skeleton variant="text" width="60%" height={14} className="mb-4" />
      <Skeleton variant="text" width="40%" height={12} />
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '75%' : '100%'}
          height={14}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  );
}

export function SkeletonButton({ width = 100, className = '' }: { width?: number; className?: string }) {
  return (
    <Skeleton
      variant="rounded"
      width={width}
      height={40}
      className={className}
    />
  );
}
