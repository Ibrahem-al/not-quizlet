/**
 * Global toast notifications: success (auto-dismiss), warning (ack), error (persistent).
 * No alert() or window.confirm() – all feedback via inline/contextual UI.
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  /** When to auto-dismiss (ms). 0 = no auto-dismiss (user must acknowledge). */
  duration: number;
  createdAt: number;
}

const defaultDuration: Record<ToastType, number> = {
  success: 3000,
  warning: 0,
  error: 0,
  info: 4000,
};

let idCounter = 0;

interface ToastState {
  toasts: ToastItem[];
}

interface ToastActions {
  show: (type: ToastType, message: string, duration?: number) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const useToastStore = create<ToastState & ToastActions>((set) => ({
  toasts: [],

  show: (type, message, duration) => {
    const id = `toast-${++idCounter}-${Date.now()}`;
    const durationMs = duration ?? defaultDuration[type];
    const item: ToastItem = {
      id,
      type,
      message,
      duration: durationMs,
      createdAt: Date.now(),
    };
    set((s) => ({ toasts: [...s.toasts, item] }));
    return id;
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  dismissAll: () => set({ toasts: [] }),
}));
