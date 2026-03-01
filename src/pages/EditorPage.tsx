/**
 * Studio Mode: full-screen bilateral card editor with stream, sidebar, auto-save.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import { useStudyStore } from '../stores/studyStore';
import { useValidationStore } from '../stores/validationStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { EditorStream } from '../components/editor/EditorStream';
import { AISidebar } from '../components/editor/AISidebar';
import { ValidationBadge } from '../components/validation';
import { Button } from '../components/ui';
import { Toast } from '../components/ui/Toast';
import '../styles/editor.css';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const loadSet = useEditorStore((s) => s.loadSet);
  const set = useEditorStore((s) => s.set);
  const sets = useStudyStore((s) => s.sets);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [savedPulse, setSavedPulse] = useState(false);
  const [triggerImageModal, setTriggerImageModal] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const loadSets = useStudyStore((s) => s.loadSets);
  const studySet = id ? sets.find((s) => s.id === id) : null;

  useEffect(() => {
    if (id && !studySet) loadSets();
  }, [id, studySet, loadSets]);

  useEffect(() => {
    if (studySet) loadSet(studySet);
  }, [studySet, loadSet]);

  const runValidation = useValidationStore((s) => s.runValidation);
  const cardErrors = useValidationStore((s) => s.cardErrors);

  useEffect(() => {
    runValidation(set ?? null);
  }, [set?.id, set?.cards, runValidation, set]);

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
