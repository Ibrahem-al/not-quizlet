import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      resolvedTheme: 'light',

      setTheme: (theme) => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        set({ theme, resolvedTheme: resolved });
        applyTheme(resolved);
      },

      toggleTheme: () => {
        const current = get().resolvedTheme;
        const next = current === 'light' ? 'dark' : 'light';
        set({ theme: next, resolvedTheme: next });
        applyTheme(next);
      },

      initTheme: () => {
        const { theme } = get();
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        set({ resolvedTheme: resolved });
        applyTheme(resolved);

        // Listen for system theme changes when in system mode
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
          if (get().theme === 'system') {
            const newResolved = mediaQuery.matches ? 'dark' : 'light';
            set({ resolvedTheme: newResolved });
            applyTheme(newResolved);
          }
        };
        mediaQuery.addEventListener('change', handleChange);
      },
    }),
    {
      name: 'studyflow-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
