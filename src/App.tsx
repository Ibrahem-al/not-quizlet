import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HomePage } from './pages/HomePage';
import { SetDetailPage } from './pages/SetDetailPage';
import { NewSetPage } from './pages/NewSetPage';
import { StudyPage } from './pages/StudyPage';
import { StatsPage } from './pages/StatsPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { CommandPalette } from './components/ui/CommandPalette';
import { ToastManager } from './components/ui/ToastManager';
import { useAuthStore } from './stores/authStore';
import { useStudyStore } from './stores/studyStore';
import { useThemeStore } from './stores/themeStore';
import { initLanguage, useLanguageStore } from './stores/languageStore';
import './styles/globals.css';

function RedirectEditToSet() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/sets/${id}` : '/'} replace />;
}

// Page transition wrapper
function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.2,
        ease: [0.33, 1, 0.68, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// Wrap pages with transition
function withPageTransition(Component: React.ComponentType) {
  return function WrappedComponent() {
    return (
      <PageTransition>
        <Component />
      </PageTransition>
    );
  };
}

function App() {
  const [commandOpen, setCommandOpen] = useState(false);
  const initAuth = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const loadSets = useStudyStore((s) => s.loadSets);
  const initTheme = useThemeStore((s) => s.initTheme);
  const dir = useLanguageStore((s) => s.dir);

  // Initialize theme on mount
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Initialize language on mount
  useEffect(() => {
    initLanguage();
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    loadSets();
  }, [loadSets, user?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
        return;
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Search sets..."]')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <BrowserRouter>
      <div dir={dir} className="min-h-screen">
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={withPageTransition(HomePage)()} />
          <Route path="/signin" element={withPageTransition(SignInPage)()} />
          <Route path="/signup" element={withPageTransition(SignUpPage)()} />
          <Route path="/sets/new" element={withPageTransition(NewSetPage)()} />
          <Route path="/sets/:id" element={withPageTransition(SetDetailPage)()} />
          <Route path="/sets/:id/edit" element={<RedirectEditToSet />} />
          <Route path="/sets/:id/study/:mode" element={withPageTransition(StudyPage)()} />
          <Route path="/stats" element={withPageTransition(StatsPage)()} />
        </Routes>
      </AnimatePresence>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <ToastManager />
      </div>
    </BrowserRouter>
  );
}

export default App;
