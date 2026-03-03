/**
 * Studio Mode: full-screen bilateral card editor with stream, sidebar, auto-save.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Save } from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import { useStudyStore } from '../stores/studyStore';
import { useValidationStore } from '../stores/validationStore';
import { useToastStore } from '../stores/toastStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { EditorStream } from '../components/editor/EditorStream';
import { AISidebar } from '../components/editor/AISidebar';
import { ValidationBadge } from '../components/validation';
import { Button } from '../components/ui';
import { Toast } from '../components/ui/Toast';
import '../styles/editor.css';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loadSet = useEditorStore((s) => s.loadSet);
  const set = useEditorStore((s) => s.set);
  const unsavedChanges = useEditorStore((s) => s.unsavedChanges);
  const setSaved = useEditorStore((s) => s.setSaved);
  const sets = useStudyStore((s) => s.sets);
  const replaceSet = useStudyStore((s) => s.replaceSet);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [savedPulse, setSavedPulse] = useState(false);
  const [triggerImageModal, setTriggerImageModal] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const showToast = useToastStore((s) => s.show);
  const runValidation = useValidationStore((s) => s.runValidation);
  const canSave = useValidationStore((s) => s.canSave);

  const loadSets = useStudyStore((s) => s.loadSets);
  const studySet = id ? sets.find((s) => s.id === id) : null;

  useEffect(() => {
    if (id && !studySet) loadSets();
  }, [id, studySet, loadSets]);

  useEffect(() => {
    if (studySet) loadSet(studySet);
  }, [studySet, loadSet]);

  const cardErrors = useValidationStore((s) => s.cardErrors);

  useEffect(() => {
    runValidation(set ?? null);
  }, [set?.id, set?.cards, runValidation, set]);

  const handleSaveAndExit = useCallback(async () => {
    if (!set || !id) return;

    setIsSaving(true);

    // Run validation first
    runValidation(set);

    if (!canSave()) {
      showToast('error', 'Fix validation errors before saving (e.g. empty terms).', 4000);
      setIsSaving(false);
      return;
    }

    try {
      const now = Date.now();
      await replaceSet({ ...set, updatedAt: now });
      setSaved(now);
      showToast('success', 'Set saved successfully!', 2000);

      // Small delay to show the success message before navigating
      setTimeout(() => {
        navigate(`/sets/${id}`);
      }, 500);
    } catch (err) {
      showToast('error', 'Save failed. Please try again.', 4000);
      setIsSaving(false);
    }
  }, [set, id, runValidation, canSave, replaceSet, setSaved, showToast, navigate]);

  useAutoSave();

  const validationErrors = set ? Array.from(cardErrors.entries()).flatMap(([, list]) => list) : [];
  const firstErrorCardId = set?.cards.find((c) => cardErrors.has(c.id))?.id;
  const totalErrorCount = validationErrors.length;

  useEffect(() => {
    const interval = setInterval(() => {
      if (!useEditorStore.getState().unsavedChanges) {
        setSavedPulse(true);
        setTimeout(() => setSavedPulse(false), 600);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Warn before closing/refreshing if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">Missing set ID.</p>
        <Link to="/"><Button variant="secondary">Home</Button></Link>
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">Set not found.</p>
        <Link to="/"><Button variant="secondary">Home</Button></Link>
      </div>
    );
  }

  return (
    <div className="studio-mode min-h-screen">
      <header className="studio-header sticky top-0 z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to={`/sets/${id}`}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            ← Back to set
          </Link>
          <span className="text-lg font-semibold text-[var(--color-text)] truncate max-w-[280px]">
            {set?.title ?? studySet.title}
          </span>
          {totalErrorCount > 0 && (
            <ValidationBadge
              count={totalErrorCount}
              errors={validationErrors}
              scrollTargetId={firstErrorCardId ? `card-${firstErrorCardId}` : undefined}
            />
          )}
          {savedPulse && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs text-[var(--color-success)]"
            >
              <Check className="w-4 h-4" strokeWidth={3} />
              Saved
            </motion.span>
          )}
          {unsavedChanges && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAndExit}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
            style={{ minHeight: '40px' }}
            title={unsavedChanges ? 'You have unsaved changes' : 'All changes saved'}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : unsavedChanges ? 'Save & Exit' : 'Saved'}
          </button>
        </div>
      </header>

      <div className="flex">
        <main className="studio-main flex-1 min-w-0 max-w-4xl mx-auto px-4 py-6">
          <EditorStream
            activeCardIndex={activeCardIndex}
            onActiveCardChange={setActiveCardIndex}
            editorRef={editorRef}
            triggerImageModal={triggerImageModal}
            onImageModalTriggered={() => setTriggerImageModal(null)}
            onRequestImageModal={(index) => setTriggerImageModal(index)}
          />
        </main>
        <AISidebar open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} onToast={setToast} />
      </div>

      {toast && (
        <Toast message={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
