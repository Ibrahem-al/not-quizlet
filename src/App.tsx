import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastManager } from './components/ui/ToastManager';

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const SetDetailPage = lazy(() => import('./pages/SetDetailPage').then(m => ({ default: m.SetDetailPage })));
const NewSetPage = lazy(() => import('./pages/NewSetPage').then(m => ({ default: m.NewSetPage })));
const StudyPage = lazy(() => import('./pages/StudyPage').then(m => ({ default: m.StudyPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })));
const PublicSetsPage = lazy(() => import('./pages/PublicSetsPage').then(m => ({ default: m.PublicSetsPage })));
const SignInPage = lazy(() => import('./pages/SignInPage').then(m => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import('./pages/SignUpPage').then(m => ({ default: m.SignUpPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage').then(m => ({ default: m.AccountSettingsPage })));
const FolderDetailPage = lazy(() => import('./pages/FolderDetailPage'));
const SharedWithMePage = lazy(() => import('./pages/SharedWithMePage'));
const AcceptSharePage = lazy(() => import('./pages/AcceptSharePage'));
const JoinPage = lazy(() => import('./pages/live/JoinPage').then(m => ({ default: m.JoinPage })));
const HostPage = lazy(() => import('./pages/live/HostPage').then(m => ({ default: m.HostPage })));
const PlayerGamePage = lazy(() => import('./pages/live/PlayerGamePage').then(m => ({ default: m.PlayerGamePage })));
const CommandPalette = lazy(() => import('./components/ui/CommandPalette').then(m => ({ default: m.CommandPalette })));
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
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>}>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={withPageTransition(HomePage)()} />
          <Route path="/signin" element={withPageTransition(SignInPage)()} />
          <Route path="/signup" element={withPageTransition(SignUpPage)()} />
          <Route path="/forgot-password" element={withPageTransition(ForgotPasswordPage)()} />
          <Route path="/reset-password" element={withPageTransition(ResetPasswordPage)()} />
          <Route path="/account/settings" element={withPageTransition(AccountSettingsPage)()} />
          <Route path="/explore" element={withPageTransition(PublicSetsPage)()} />
          <Route path="/folders/:id" element={withPageTransition(FolderDetailPage)()} />
          <Route path="/shared" element={withPageTransition(SharedWithMePage)()} />
          <Route path="/share/:token" element={withPageTransition(AcceptSharePage)()} />
          <Route path="/sets/new" element={withPageTransition(NewSetPage)()} />
          <Route path="/sets/:id" element={withPageTransition(SetDetailPage)()} />
          <Route path="/sets/:id/edit" element={<RedirectEditToSet />} />
          <Route path="/sets/:id/study/:mode" element={withPageTransition(StudyPage)()} />
          <Route path="/stats" element={withPageTransition(StatsPage)()} />
          <Route path="/live" element={withPageTransition(JoinPage)()} />
          <Route path="/live/play" element={withPageTransition(PlayerGamePage)()} />
          <Route path="/live/host/:sessionId" element={withPageTransition(HostPage)()} />
        </Routes>
      </AnimatePresence>
      </Suspense>
      <Suspense fallback={null}>
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      </Suspense>
      <ToastManager />
      </div>
    </BrowserRouter>
  );
}

export default App;
