import { motion, type HTMLMotionProps } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-medium px-4 py-2 min-h-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors duration-[var(--duration-fast)]';
  const variants = {
    primary:
      'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
    secondary:
      'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:border-[var(--color-text-secondary)]/40',
    danger: 'bg-[var(--color-danger)] text-white hover:opacity-95',
    ghost: 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-primary-muted)]',
  };

  return (
    <motion.button
      className={`${base} ${variants[variant]} ${className}`}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      {...props}
    >
      {children}
    </motion.button>
  );
}
