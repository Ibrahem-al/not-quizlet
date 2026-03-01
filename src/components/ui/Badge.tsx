interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  const variants = {
    default: 'bg-[var(--color-text-secondary)]/20 text-[var(--color-text)]',
    success: 'bg-[var(--color-success)]/30 text-[var(--color-text)]',
    warning: 'bg-[var(--color-warning)]/40 text-[var(--color-text)]',
    danger: 'bg-[var(--color-danger)]/30 text-[var(--color-text)]',
  };

  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
