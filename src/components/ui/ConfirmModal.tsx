import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) firstFocusRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden
      />
      <motion.div
        className="relative bg-[var(--color-surface)] rounded-[var(--radius-card)] p-6 shadow-lg max-w-sm w-full"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-[var(--color-text)] mb-2">
          {title}
        </h2>
        {body && (
          <div className="text-[var(--color-text-secondary)] text-sm mb-4">
            {body}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onCancel} ref={firstFocusRef}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
