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
  Clock,
  AlertCircle,
  MoreVertical,
  Edit3,
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
  { path: 'flashcards', label: 'Flashcards', icon: LayoutGrid, description: 'Flip through cards, swipe to rate.', color: 'from-blue-500 to-indigo-500' },
  { path: 'learn', label: 'Learn', icon: BookOpen, description: 'Spaced repetition with mixed question types.', color: 'from-emerald-500 to-teal-500' },
  { path: 'match', label: 'Match', icon: Puzzle, description: 'Drag terms to definitions against the clock.', color: 'from-orange-500 to-amber-500' },
  { path: 'test', label: 'Test', icon: ClipboardList, description: 'Quiz with written, multiple choice, and more.', color: 'from-purple-500 to-pink-500' },
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
  const [showMoreActions, setShowMoreActions] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  localSetRef.current = localSet;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMoreActions(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

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
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-muted)] flex items-center justify-center mb-2">
            <AlertCircle className="w-8 h-8 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-[var(--color-text-secondary)] text-lg">Set not found.</p>
          <Link to="/">
            <Button variant="secondary">Back to Home</Button>
          </Link>
        </div>
      </AppLayout>
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
          setToast(`${pairs.length} cards added from photo`);
        }}
        onToast={setToast}
      />

      <div className="space-y-8">
        {/* Inline editable title & description */}
        <section>
          {editingMeta ? (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border)] p-5"
            >
              <Input
                value={titleEdit}
                onChange={(e) => setTitleEdit(e.target.value)}
                placeholder="Set title"
                icon={<Edit3 className="w-4 h-4" />}
              />
              <Input
                value={descriptionEdit}
                onChange={(e) => setDescriptionEdit(e.target.value)}
                placeholder="Description"
              />
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setEditingMeta(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMeta}>Save Changes</Button>
              </div>
            </motion.div>
          ) : (
            <div
              className="group cursor-pointer rounded-[var(--radius-card)] border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] p-4 -mx-4 transition-all duration-[var(--duration-fast)]"
              onClick={() => {
                setTitleEdit(displaySet.title);
                setDescriptionEdit(displaySet.description);
                setEditingMeta(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                (setTitleEdit(displaySet.title), setDescriptionEdit(displaySet.description), setEditingMeta(true))
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">
                    {displaySet.title || 'Untitled set'}
                  </h1>
                  <p className="text-[var(--color-text-secondary)] text-base mt-2">
                    {displaySet.description || 'Click to add a description...'}
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-muted)]">
                  <Edit3 className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {displaySet.tags.map((tag) => (
                  <Badge key={tag} variant="default">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Study modes */}
        {cards.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--color-text)] tracking-tight">
                Choose a study mode
              </h2>
              {displaySet.studyStats.totalSessions > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                  <Clock className="w-4 h-4" />
                  <span>{displaySet.studyStats.totalSessions} sessions</span>
                </div>
              )}
            </div>
            
            {!canStartStudying && minCardsError && (
              <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-[var(--color-text)]">
                  <AlertCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                  <p className="font-medium">{minCardsError.message}</p>
                </div>
                <p className="mt-1 text-[var(--color-text-secondary)] ml-6">Add another card below to start studying.</p>
              </div>
            )}
            
            {duplicateTermsError && (
              <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-[var(--color-text)]">
                  <AlertCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                  <p>{duplicateTermsError.message}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {modes.map(({ path, label, icon: Icon, description, color }) =>
                canStartStudying ? (
                  <Link key={path} to={`/sets/${displaySet.id}/study/${path}`}>
                    <Card variant="elevated" className="flex flex-col items-center gap-2 py-5 min-h-[120px] justify-center text-center group cursor-pointer relative overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg mb-1`}>
                        <Icon className="w-6 h-6 text-white shrink-0" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
                      <span className="text-xs text-[var(--color-text-tertiary)] px-2 leading-relaxed">
                        {description}
                      </span>
                    </Card>
                  </Link>
                ) : (
                  <div
                    key={path}
                    className="flex flex-col items-center gap-2 py-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] opacity-50 cursor-not-allowed text-center min-h-[120px] justify-center"
                    aria-disabled="true"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-text-muted)]/30 flex items-center justify-center mb-1">
                      <Icon className="w-6 h-6 text-[var(--color-text-tertiary)] shrink-0" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
                    <span className="text-xs text-[var(--color-text-tertiary)] px-2 leading-relaxed">{description}</span>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* Inline cards + Add card */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[var(--color-text)] tracking-tight">
                Cards
              </h2>
              <span className="text-sm text-[var(--color-text-tertiary)] bg-[var(--color-surface-muted)] px-2.5 py-1 rounded-full font-medium">
                {cards.length}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="relative" ref={moreRef}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowMoreActions((o) => !o)}
                  className="gap-2"
                >
                  <MoreVertical className="w-4 h-4" />
                  Actions
                </Button>
                {showMoreActions && (
                  <div className="absolute right-0 top-full mt-2 py-1.5 min-w-[180px] rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] z-20 animate-fade-in">
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] flex items-center gap-2.5 transition-colors"
                      onClick={() => { setShowPhotoImport(true); setShowMoreActions(false); }}
                    >
                      <ImagePlus className="w-4 h-4 text-[var(--color-primary)]" /> Photo import
                    </button>
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] flex items-center gap-2.5 transition-colors"
                      onClick={() => { setImportExpanded((e) => !e); setShowMoreActions(false); }}
                    >
                      <Plus className="w-4 h-4 text-[var(--color-success)]" /> Paste many
                    </button>
                    <div className="border-t border-[var(--color-border)] my-1" />
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 flex items-center gap-2.5 transition-colors"
                      onClick={() => { setShowDeleteConfirm(true); setShowMoreActions(false); }}
                    >
                      <Trash2 className="w-4 h-4" /> Delete set
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {importExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] space-y-3"
            >
              <p className="text-sm text-[var(--color-text-secondary)]">
                One per line: <code className="px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-primary)] font-mono text-xs">term - definition</code> or tab-separated
              </p>
              <textarea
                className="w-full min-h-[100px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm focus:outline-none focus:ring-[3px] focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all resize-y"
                placeholder="Hola - Hello&#10;Gracias - Thank you&#10;Por favor - Please"
                value={importText}
                onChange={(e) => { setImportText(e.target.value); setImportParseError(false); }}
              />
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={() => { const p = parseImportText(importText); setImportPreview(p.length ? p : null); setImportParseError(p.length === 0 && !!importText.trim()); }}>
                  Preview
                </Button>
                {importPreview && (
                  <>
                    <span className="self-center text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface-muted)] px-3 py-1.5 rounded-full">
                      {importPreview.length} cards
                    </span>
                    <Button size="sm" onClick={handleConfirmImport} disabled={addingCard}>{addingCard ? 'Adding...' : 'Add all'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setImportPreview(null)}>Cancel</Button>
                  </>
                )}
              </div>
              {importParseError && <p className="text-sm text-[var(--color-danger)] font-medium">No valid pairs found.</p>}
            </motion.div>
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

          <motion.button
            type="button"
            onClick={() => handleAddCard()}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            className="mt-4 w-full rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-border)] py-6 flex items-center justify-center gap-2 text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-muted)]/20 transition-all duration-[var(--duration-normal)] font-medium"
          >
            <Plus className="w-5 h-5 shrink-0" />
            Add card
            <span className="text-xs text-[var(--color-text-tertiary)]">(or press Enter)</span>
          </motion.button>
        </section>
      </div>

      {/* Save indicator */}
      <AnimatePresence>
        {(saveStatus === 'saving' || saveStatus === 'saved') && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2.5 shadow-[var(--shadow-modal)] text-sm"
          >
            {saveStatus === 'saving' && (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
                <span className="text-[var(--color-text-secondary)]">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <div className="w-4 h-4 rounded-full bg-[var(--color-success)] flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[var(--color-success)] font-medium">Saved</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
