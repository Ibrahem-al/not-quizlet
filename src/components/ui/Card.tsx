import { motion, type HTMLMotionProps } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  hover?: boolean;
}

export function Card({ 
  children, 
  variant = 'default',
  hover = true,
  className = '', 
  ...props 
}: CardProps) {
  const base = 'rounded-[var(--radius-card)] transition-all duration-[var(--duration-normal)]';
  
  const variants = {
    default: 'bg-[var(--color-surface)] shadow-[var(--shadow-card)] border border-[var(--color-border)]',
    elevated: 'bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)] border border-[var(--color-border)]',
    outlined: 'bg-transparent border-2 border-[var(--color-border)] hover:border-[var(--color-primary)]/30',
    ghost: 'bg-[var(--color-surface-muted)] border border-transparent',
  };

  const padding = 'p-5 md:p-6';

  if (!hover) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { whileHover, whileTap, animate, initial, exit, transition, ...divProps } = props as Record<string, unknown>;
    return (
      <div
        className={`${base} ${variants[variant]} ${padding} ${className}`}
        {...divProps}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={`${base} ${variants[variant]} ${padding} ${className}`}
      initial={false}
      whileHover={{ 
        scale: 1.01, 
        y: -2,
        boxShadow: 'var(--shadow-card-hover)',
      }}
      transition={spring}
      {...props}
    >
      {children}
    </motion.div>
  );
}
