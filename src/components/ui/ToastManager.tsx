/**
 * Renders global toasts from toastStore. Success auto-dismiss; warning/error require ack.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastType } from '../../stores/toastStore';

const typeConfig: Record<ToastType, { 
  icon: React.ElementType; 
  bgClass: string; 
  iconClass: string;
  borderClass: string;
}> = {
  success: { 
    icon: CheckCircle, 
    bgClass: 'bg-[var(--color-success)]/10',
    iconClass: 'text-[var(--color-success)]',
    borderClass: 'border-[var(--color-success)]/20',
  },
  warning: { 
    icon: AlertTriangle, 
    bgClass: 'bg-[var(--color-warning)]/10',
    iconClass: 'text-[var(--color-warning)]',
    borderClass: 'border-[var(--color-warning)]/20',
  },
  error: { 
    icon: XCircle, 
    bgClass: 'bg-[var(--color-danger)]/10',
    iconClass: 'text-[var(--color-danger)]',
    borderClass: 'border-[var(--color-danger)]/20',
  },
  info: { 
    icon: Info, 
    bgClass: 'bg-[var(--color-primary)]/10',
    iconClass: 'text-[var(--color-primary)]',
    borderClass: 'border-[var(--color-primary)]/20',
  },
};

function SingleToast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const config = typeConfig[item.type];
  const Icon = config.icon;
  const hasProgress = item.duration > 0;

  useEffect(() => {
    if (!hasProgress) return;
    
    const startTime = Date.now();
    const endTime = startTime + item.duration;
    
    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const newProgress = (remaining / item.duration) * 100;
      setProgress(newProgress);
      
      if (remaining > 0) {
        requestAnimationFrame(updateProgress);
      }
    };
    
    const animationFrame = requestAnimationFrame(updateProgress);
    const t = setTimeout(onDismiss, item.duration);
    
    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(t);
    };
  }, [item.duration, item.id, onDismiss, hasProgress]);

  return (
    <motion.div
      layout
      role="status"
      aria-live={item.type === 'error' ? 'assertive' : 'polite'}
      initial={{ opacity: 0, y: 12, scale: 0.95, x: '-50%' }}
      animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
      exit={{ opacity: 0, y: 8, scale: 0.95, x: '-50%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative min-w-[300px] max-w-md overflow-hidden"
    >
      <div className={`flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border shadow-[var(--shadow-lg)] ${config.borderClass}`}>
        <div className={`w-8 h-8 rounded-full ${config.bgClass} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${config.iconClass}`} />
        </div>
        
        <span className="text-sm font-medium flex-1 text-[var(--color-text)]">{item.message}</span>
        
        {(item.type === 'warning' || item.type === 'error' || item.duration === 0) && (
          <button
            type="button"
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Progress bar */}
      {hasProgress && (
        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--color-border)] rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${item.type === 'success' ? 'bg-[var(--color-success)]' : item.type === 'error' ? 'bg-[var(--color-danger)]' : item.type === 'warning' ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-primary)]'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0 }}
          />
        </div>
      )}
    </motion.div>
  );
}

export function ToastManager() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-6 left-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
      <div className="flex flex-col gap-3 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <SingleToast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
