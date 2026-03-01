import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  BookOpen,
  Puzzle,
  ClipboardList,
  Trash2,
  Plus,
  ImagePlus,
} from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Input, Badge } from '../components/ui';
import { AppLayout } from '../components/layout/AppLayout';
import { Toast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EditableCard } from '../components/inline';
import { useStudySet } from '../hooks/useStudySet';
import { useSetPattern } from '../hooks/useSetPattern';
import { useStudyStore } from '../stores/studyStore';
import { validateSet } from '../lib/validation';
import { parseImportText } from '../lib/importText';
import { uuid, timestamp } from '../lib/utils';
import { PhotoImportModal } from '../components/import/PhotoImportModal';
import type { Card as CardType, StudySet } from '../types';

const modes = [
  { path: 'flashcards', label: 'Flashcards', icon: LayoutGrid, description: 'Flip through cards, swipe to rate.' },
  { path: 'learn', label: 'Learn', icon: BookOpen, description: 'Spaced repetition with mixed question types.' },
  { path: 'match', label: 'Match', icon: Puzzle, description: 'Drag terms to definitions against the clock.' },
  { path: 'test', label: 'Test', icon: ClipboardList, description: 'Quiz with written, multiple choice, and more.' },
] as const;

const defaultCard = (): CardType => ({
  id: uuid(),
  term: '',
  definition: '',
  difficulty: 0,
  repetition: 0,
  interval: 0,
  efFactor: 2.5,
  nextReviewDate: 0,
  history: [],
});

export function SetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const set = useStudySet(id);
  const { deleteSet, replaceSet } = useStudyStore();
  const [localSet, setLocalSet] = useState<StudySet | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);
  const localSetRef = useRef<StudySet | null>(null);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<{ term: string; definition: string }[] | null>(null);
  const [importExpanded, setImportExpanded] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPhotoImport, setShowPhotoImport] = useState(false);
  const [importParseError, setImportParseError] = useState(false);
  const [titleEdit, setTitleEdit] = useState('');
  const [descriptionEdit, setDescriptionEdit] = useState('');
  const [editingMeta, setEditingMeta] = useState(false);

  localSetRef.current = localSet;

  useEffect(() => {
    if (set && !dirty) {
      setLocalSet(set);
      setTitleEdit(set.title);
      setDescriptionEdit(set.description);
    }
  }, [set, dirty]);

  const debouncedSave = useDebouncedCallback(() => {
    const payload = localSetRef.current;
    if (payload) {
      setSaveStatus('saving');
      replaceSet({ ...payload, updatedAt: timestamp() }).then(() => {
        setDirty(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      });
    }
  }, 500);

  const applyCardUpdate = useCallback((cardId: string, updates: Partial<CardType>) => {
    setLocalSet((prev) => {
      if (!prev) return prev;
      const cards = prev.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c));
      return { ...prev, cards, updatedAt: timestamp() };
    });
    setDirty(true);
    debouncedSave();
  }, [debouncedSave]);

  const handleAddCard = useCallback((atIndex?: number) => {
    const newCard = defaultCard();
    setLocalSet((prev) => {
      if (!prev) return prev;
      const cards = [...prev.cards];
      const i = atIndex ?? cards.length;
      cards.splice(i, 0, newCard);
      return { ...prev, cards, updatedAt: timestamp() };
    });
    setDirty(true);
    debouncedSave();
    setFocusedCardIndex(atIndex ?? localSetRef.current?.cards.length ?? 0);
  }, [debouncedSave]);

  const handleDeleteCard = useCallback((cardId: string) => {
    setLocalSet((prev) => {
      if (!prev) return prev;
      const cards = prev.cards.filter((c) => c.id !== cardId);
      return { ...prev, cards, updatedAt: timestamp() };
    });
    setDirty(true);
    debouncedSave();
  }, [debouncedSave]);

  const handleSaveMeta = useCallback(() => {
    setLocalSet((prev) => {
      if (!prev) return prev;
      return { ...prev, title: titleEdit, description: descriptionEdit, updatedAt: timestamp() };
    });
    setDirty(true);
    debouncedSave();
    setEditingMeta(false);
  }, [titleEdit, descriptionEdit, debouncedSave]);

  const handleConfirmImport = useCallback(async () => {
    if (!importPreview?.length || !localSet) return;
    setAddingCard(true);
    const newCards: CardType[] = importPreview.map((p) => ({ ...defaultCard(), term: p.term, definition: p.definition }));
    setLocalSet((prev) => {
      if (!prev) return prev;
      return { ...prev, cards: [...prev.cards, ...newCards], updatedAt: timestamp() };
    });
    setImportText('');
    setImportPreview(null);
    setDirty(true);
    debouncedSave();
    setToast(importPreview.length === 1 ? '1 card added' : `${importPreview.length} cards added`);
    setAddingCard(false);
  }, [importPreview, localSet, debouncedSave]);

  const { pattern, canSuggest } = useSetPattern(localSet?.cards ?? []);

  if (!set) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">Set not found.</p>
        <Link to="/"><Button variant="secondary">Home</Button></Link>
      </div>
    );
  }

  const displaySet = localSet ?? set;
  const breadcrumbs = [{ label: displaySet.title }];
  const setValidation = validateSet(displaySet);
  const canStartStudying = setValidation.canStudy;
  const minCardsError = setValidation.errors.find((e) => e.code === 'MINIMUM_CARDS');
  const duplicateTermsError = setValidation.errors.find((e) => e.code === 'DUPLICATE_TERMS');
  const cards = displaySet.cards;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <AnimatePresence>
        {toast && <Toast key={toast} message={toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this set?"
        body="All cards will be removed. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          deleteSet(set.id);
          setShowDeleteConfirm(false);
          navigate('/');
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <PhotoImportModal
        open={showPhotoImport}
        onClose={() => setShowPhotoImport(false)}
        onConfirm={async (pairs) => {
          setAddingCard(true);
          const newCards: CardType[] = pairs.map((p) => ({ ...defaultCard(), term: p.term, definition: p.definition }));
          setLocalSet((prev) => {
            if (!prev) return prev;
            return { ...prev, cards: [...prev.cards, ...newCards], updatedAt: timestamp() };
          });
          setDirty(true);
          debouncedSave();
          setAddingCard(false);
        }}
        onToast={setToast}
      />

      <div className="space-y-8">
        {/* Inline editable title & description */}
        <div>
          {editingMeta ? (
            <div className="space-y-2">
              <Input value={titleEdit} onChange={(e) => setTitleEdit(e.target.value)} placeholder="Set title" />
              <Input value={descriptionEdit} onChange={(e) => setDescriptionEdit(e.target.value)} placeholder="Description" />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditingMeta(false)}>Cancel</Button>
                <Button onClick={handleSaveMeta}>Done</Button>
              </div>
            </div>
          ) : (
            <div
              className="cursor-text"
              onClick={() => {
                setTitleEdit(displaySet.title);
                setDescriptionEdit(displaySet.description);
                setEditingMeta(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && (setTitleEdit(displaySet.title), setDescriptionEdit(displaySet.description), setEditingMeta(true))}
            >
              <h1 className="text-2xl font-bold text-[var(--color-text)] hover:bg-[var(--color-text-secondary)]/5 rounded px-1 -mx-1">
                {displaySet.title || 'Untitled set'}
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-1 hover:bg-[var(--color-text-secondary)]/5 rounded px-1 -mx-1">
                {displaySet.description || 'Add a description...'}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {displaySet.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(true)} aria-label="Delete set">
              <Trash2 className="w-4 h-4" /> Delete set
            </Button>
          </div>
        </div>

        {/* Study modes */}
        {cards.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">Choose a study mode</h2>
            {!canStartStudying && minCardsError && (
              <div className="mb-3 rounded-lg border border-[var(--color-warning)]/50 bg-[var(--color-warning)]/10 px-4 py-3 text-sm text-[var(--color-text)]">
                <p className="font-medium">{minCardsError.message}</p>
                <p className="mt-1 text-[var(--color-text-secondary)]">Add another card below.</p>
              </div>
            )}
            {duplicateTermsError && (
              <div className="mb-3 rounded-lg border border-[var(--color-warning)]/50 bg-[var(--color-warning)]/10 px-4 py-3 text-sm text-[var(--color-text)]">
                <p>{duplicateTermsError.message}</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {modes.map(({ path, label, icon: Icon, description }) =>
                canStartStudying ? (
                  <Link key={path} to={`/sets/${displaySet.id}/study/${path}`}>
                    <Card className="flex flex-col items-center gap-2 py-4 hover:bg-[var(--color-background)] min-h-[44px] justify-center">
                      <Icon className="w-8 h-8 text-[var(--color-primary)]" />
                      <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
                      <span className="text-xs text-[var(--color-text-secondary)] text-center px-1">{description}</span>
                    </Card>
                  </Link>
                ) : (
                  <div key={path} className="flex flex-col items-center gap-2 py-4 rounded-[var(--radius-card)] border border-[var(--color-text-secondary)]/20 bg-[var(--color-surface)] opacity-75 cursor-not-allowed" aria-disabled="true">
                    <Icon className="w-8 h-8 text-[var(--color-text-secondary)]" />
                    <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
                    <span className="text-xs text-[var(--color-text-secondary)] text-center px-1">{description}</span>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* Inline cards + Add card */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Cards</h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-text-secondary)]/5 rounded-lg flex items-center gap-2"
                onClick={() => setShowPhotoImport(true)}
              >
                <ImagePlus className="w-4 h-4" /> Photo
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-text-secondary)]/5 rounded-lg flex items-center justify-between gap-2"
                onClick={() => setImportExpanded((e) => !e)}
                aria-expanded={importExpanded}
              >
                Paste to add many {importExpanded ? '−' : '+'}
              </button>
            </div>
          </div>

          {importExpanded && (
            <div className="mb-4 p-3 rounded-lg border border-[var(--color-text-secondary)]/20 space-y-2">
              <p className="text-sm text-[var(--color-text-secondary)]">
                One per line: &quot;term - definition&quot; or tab-separated
              </p>
              <textarea
                className="w-full min-h-[80px] rounded-[var(--radius-button)] border border-[var(--color-text-secondary)]/30 bg-[var(--color-surface)] px-3 py-2 text-sm"
                placeholder="Hola - Hello&#10;Gracias - Thank you"
                value={importText}
                onChange={(e) => { setImportText(e.target.value); setImportParseError(false); }}
              />
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" onClick={() => { const p = parseImportText(importText); setImportPreview(p.length ? p : null); setImportParseError(p.length === 0 && !!importText.trim()); }}>
                  Preview
                </Button>
                {importPreview && (
                  <>
                    <span className="self-center text-sm text-[var(--color-text-secondary)]">{importPreview.length} cards</span>
                    <Button onClick={handleConfirmImport} disabled={addingCard}>{addingCard ? 'Adding…' : 'Add all'}</Button>
                    <Button variant="ghost" onClick={() => setImportPreview(null)}>Cancel</Button>
                  </>
                )}
              </div>
              {importParseError && <p className="text-sm text-[var(--color-danger)]">No valid pairs found.</p>}
            </div>
          )}

          <ul className="space-y-3">
            {cards.map((card, index) => (
              <EditableCard
                key={card.id}
                card={card}
                cardIndex={index}
                pattern={pattern}
                canSuggest={canSuggest}
                focusedCardIndex={focusedCardIndex}
                onUpdate={(updates) => applyCardUpdate(card.id, updates)}
                onDelete={() => handleDeleteCard(card.id)}
                onAddImage={(base64) => applyCardUpdate(card.id, { imageData: base64 })}
                onEnterInDefinition={() => handleAddCard(index + 1)}
                onFocusNextCard={() => setFocusedCardIndex(index + 1 < cards.length ? index + 1 : null)}
                onFocusPrevCard={() => setFocusedCardIndex(index > 0 ? index - 1 : null)}
              />
            ))}
          </ul>

          <button
            type="button"
            onClick={() => handleAddCard()}
            className="mt-3 w-full rounded-lg border-2 border-dashed border-[var(--color-text-secondary)]/30 py-6 flex items-center justify-center gap-2 text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <Plus className="w-5 h-5" /> Add card (or press Enter in definition)
          </button>
        </section>
      </div>

      {/* Save indicator */}
      <AnimatePresence>
        {(saveStatus === 'saving' || saveStatus === 'saved') && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-text-secondary)]/20 px-3 py-2 shadow-lg text-sm text-[var(--color-text-secondary)]"
          >
            {saveStatus === 'saving' && <span className="animate-pulse">Saving...</span>}
            {saveStatus === 'saved' && <span className="text-[var(--color-success)]">All changes saved</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
