import { motion, type HTMLMotionProps } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <motion.div
      className={`rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-4 md:p-6 ${className}`}
      initial={false}
      whileHover={{ scale: 1.02, boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
      transition={spring}
      {...props}
    >
      {children}
    </motion.div>
  );
}
