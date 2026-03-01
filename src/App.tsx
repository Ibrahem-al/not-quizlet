import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import './styles/globals.css';

function RedirectEditToSet() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/sets/${id}` : '/'} replace />;
}

function App() {
  const [commandOpen, setCommandOpen] = useState(false);
  const initAuth = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const loadSets = useStudyStore((s) => s.loadSets);

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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/sets/new" element={<NewSetPage />} />
        <Route path="/sets/:id" element={<SetDetailPage />} />
        <Route path="/sets/:id/edit" element={<RedirectEditToSet />} />
        <Route path="/sets/:id/study/:mode" element={<StudyPage />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <ToastManager />
    </BrowserRouter>
  );
}

export default App;
