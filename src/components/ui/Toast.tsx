import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
  type?: 'success' | 'info' | 'warning' | 'error';
}

export function Toast({ message, onDismiss, duration = 2500, type = 'info' }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration <= 0) return;
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const newProgress = (remaining / duration) * 100;
      setProgress(newProgress);
      
      if (remaining > 0) {
        requestAnimationFrame(updateProgress);
      }
    };
    
    const animationFrame = requestAnimationFrame(updateProgress);
    const timeout = setTimeout(onDismiss, duration);
    
    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(timeout);
    };
  }, [onDismiss, duration]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 min-w-[280px] max-w-md overflow-hidden"
    >
      <div className="relative px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-[var(--shadow-modal)] border border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          {type === 'success' && (
            <div className="w-6 h-6 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
            </div>
          )}
          <span className="text-sm font-medium flex-1">{message}</span>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress bar for auto-dismiss */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-border)]">
            <motion.div
              className={`h-full ${type === 'success' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-primary)]'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
