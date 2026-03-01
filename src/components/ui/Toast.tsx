import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, onDismiss, duration = 2500 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-[var(--radius-button)] bg-[var(--color-text)] text-[var(--color-surface)] text-sm shadow-lg"
    >
      {message}
    </motion.div>
  );
}
