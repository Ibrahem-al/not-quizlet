import { motion, type HTMLMotionProps } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 400, damping: 25 };

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'default',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:pointer-events-none transition-all duration-[var(--duration-fast)]';

  const sizes = {
    default: 'px-4 py-2.5 min-h-[44px] rounded-[var(--radius-button)] text-sm',
    sm: 'px-3 py-1.5 min-h-[36px] rounded-[var(--radius-md)] text-xs',
    lg: 'px-6 py-3 min-h-[52px] rounded-[var(--radius-lg)] text-base',
    icon: 'w-10 h-10 p-0 rounded-[var(--radius-button)]',
  };

  const variants = {
    primary:
      'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
    secondary:
      'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] shadow-[var(--shadow-xs)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-muted)]',
    outline:
      'bg-transparent text-[var(--color-text)] border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
    danger:
      'bg-[var(--color-danger)] text-white hover:opacity-90 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
    ghost:
      'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
  };

  return (
    <motion.button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      {...props}
    >
      {children}
    </motion.button>
  );
}
