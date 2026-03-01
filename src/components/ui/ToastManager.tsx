/**
 * Renders global toasts from toastStore. Success auto-dismiss; warning/error require ack.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore, type ToastItem, type ToastType } from '../../stores/toastStore';

const typeStyles: Record<ToastType, string> = {
  success: 'bg-[var(--color-success)] text-[var(--color-text)]',
  warning: 'bg-[var(--color-warning)] text-[var(--color-text)]',
  error: 'bg-[var(--color-danger)] text-white',
  info: 'bg-[var(--color-primary)] text-white',
};

function SingleToast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    if (item.duration > 0) {
      const t = setTimeout(onDismiss, item.duration);
      return () => clearTimeout(t);
    }
  }, [item.duration, item.id, onDismiss]);

  return (
    <motion.div
      layout
      role="status"
      aria-live={item.type === 'error' ? 'assertive' : 'polite'}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-button)] shadow-lg ${typeStyles[item.type]}`}
    >
      <span className="text-sm font-medium flex-1">{item.message}</span>
      {(item.type === 'warning' || item.type === 'error' || item.duration === 0) && (
        <button
          type="button"
          className="min-h-0 py-1 px-2 rounded font-medium opacity-90 hover:opacity-100 underline-offset-2 hover:underline"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      )}
    </motion.div>
  );
}

export function ToastManager() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <SingleToast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
