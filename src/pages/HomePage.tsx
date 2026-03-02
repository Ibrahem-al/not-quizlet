import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Search, Download, Upload, Sparkles, MoreVertical, BarChart3 } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { AppLayout, NewSetButton } from '../components/layout/AppLayout';
import { useStudyStore } from '../stores/studyStore';
import type { StudySet } from '../types';

export function HomePage() {
  const { sets, loadSets, loadSettings, loaded } = useStudyStore();
  const [search, setSearch] = useState('');
  const [importFile, setImportFile] = useState<HTMLInputElement | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSets();
    loadSettings();
  }, [loadSets, loadSettings]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(sets, {
        keys: ['title', 'tags', 'cards.term'],
        threshold: 0.3,
      }),
    [sets]
  );
  const filteredSets = useMemo(() => {
    if (!search.trim()) return sets;
    return fuse.search(search).map((r) => r.item);
  }, [sets, search, fuse]);

  const loadDemoData = useCallback(async () => {
    const demoSets: StudySet[] = [
      {
        id: crypto.randomUUID(),
        title: 'Spanish Vocabulary',
        description: 'Common Spanish words and phrases',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['spanish', 'language'],
        lastStudied: 0,
        studyStats: { totalSessions: 0, averageAccuracy: 0, streakDays: 0 },
        cards: [
          { id: crypto.randomUUID(), term: 'Hola', definition: 'Hello', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Adiós', definition: 'Goodbye', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Gracias', definition: 'Thank you', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Por favor', definition: 'Please', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Sí', definition: 'Yes', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'No', definition: 'No', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Agua', definition: 'Water', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Comida', definition: 'Food', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Casa', definition: 'House', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Libro', definition: 'Book', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
        ],
      },
      {
        id: crypto.randomUUID(),
        title: 'Biology Terms',
        description: 'Basic biology vocabulary',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['biology', 'science'],
        lastStudied: 0,
        studyStats: { totalSessions: 0, averageAccuracy: 0, streakDays: 0 },
        cards: [
          { id: crypto.randomUUID(), term: 'Cell', definition: 'The basic structural and functional unit of all living organisms', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Nucleus', definition: 'Membrane-bound organelle that contains genetic material (DNA)', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Mitochondria', definition: 'Organelles that produce energy (ATP) for the cell', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Photosynthesis', definition: 'Process by which plants convert light energy into chemical energy', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'DNA', definition: 'Deoxyribonucleic acid - carries genetic instructions', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Evolution', definition: 'Change in heritable traits of populations over time', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Ecosystem', definition: 'Community of living organisms and their physical environment', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Enzyme', definition: 'Protein that speeds up chemical reactions', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Habitat', definition: 'Natural environment where an organism lives', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Species', definition: 'Group of organisms that can reproduce and produce fertile offspring', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
        ],
      },
      {
        id: crypto.randomUUID(),
        title: 'History Dates',
        description: 'Key dates in world history',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['history', 'dates'],
        lastStudied: 0,
        studyStats: { totalSessions: 0, averageAccuracy: 0, streakDays: 0 },
        cards: [
          { id: crypto.randomUUID(), term: 'Fall of Rome', definition: '476 CE', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Columbus reaches Americas', definition: '1492', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'French Revolution begins', definition: '1789', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'American Civil War', definition: '1861-1865', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'World War I', definition: '1914-1918', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'World War II', definition: '1939-1945', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Moon landing', definition: '1969', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Fall of Berlin Wall', definition: '1989', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Declaration of Independence', definition: '1776', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
          { id: crypto.randomUUID(), term: 'Renaissance period', definition: '14th-17th century', difficulty: 0, repetition: 0, interval: 0, efFactor: 2.5, nextReviewDate: 0, history: [] },
        ],
      },
    ];
    const { replaceSet, loadSets: refresh } = useStudyStore.getState();
    for (const s of demoSets) await replaceSet(s);
    await refresh();
    setMoreOpen(false);
  }, []);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(sets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studyflow-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    setMoreOpen(false);
  }, [sets]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          const arr = Array.isArray(json) ? json : [json];
          const { replaceSet } = useStudyStore.getState();
          for (const s of arr) {
            if (s.id && s.title && Array.isArray(s.cards)) await replaceSet(s);
          }
          loadSets();
        } catch {
          // ignore
        }
      };
      reader.readAsText(file);
      e.target.value = '';
      setMoreOpen(false);
    },
    [loadSets]
  );

  const headerRight = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 sm:flex-initial min-w-[160px] max-w-[220px]">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none"
          aria-hidden
        />
        <input
          type="text"
          placeholder="Search sets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-border-focus)] transition-shadow duration-[var(--duration-fast)]"
          aria-label="Search sets"
        />
      </div>
      <div className="relative" ref={moreRef}>
        <Button
          variant="secondary"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          aria-haspopup="true"
          aria-label="More options"
          className="gap-2"
        >
          <MoreVertical className="w-4 h-4 shrink-0" />
          More
        </Button>
        {moreOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 py-1 min-w-[180px] rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] z-20"
            role="menu"
          >
            <Link
              to="/stats"
              className="block w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] flex items-center gap-2 rounded-t-[var(--radius-sm)] transition-colors"
              role="menuitem"
              onClick={() => setMoreOpen(false)}
              title="View analytics"
            >
              <BarChart3 className="w-4 h-4 shrink-0" /> Stats
            </Link>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] flex items-center gap-2 transition-colors"
              role="menuitem"
              onClick={loadDemoData}
              title="Load sample sets"
            >
              <Sparkles className="w-4 h-4 shrink-0" /> Load demo data
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] flex items-center gap-2 transition-colors"
              role="menuitem"
              onClick={handleExport}
              title="Download backup as JSON"
            >
              <Download className="w-4 h-4 shrink-0" /> Export backup
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] flex items-center gap-2 rounded-b-[var(--radius-sm)] transition-colors"
              role="menuitem"
              onClick={() => importFile?.click()}
              title="Restore from JSON backup"
            >
              <Upload className="w-4 h-4 shrink-0" /> Import backup
            </button>
          </div>
        )}
        <input
          ref={setImportFile}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
          aria-hidden
        />
      </div>
      <NewSetButton />
    </div>
  );

  return (
    <AppLayout headerRight={headerRight}>
      {!loaded ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 animate-pulse"
            >
              <div className="h-5 bg-[var(--color-text-secondary)]/15 rounded w-3/4 mb-3" />
              <div className="h-4 bg-[var(--color-text-secondary)]/15 rounded w-full mb-2" />
              <div className="h-4 bg-[var(--color-text-secondary)]/15 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        sets.length === 0 ? (
          <EmptyHomeState onDemo={loadDemoData} />
        ) : (
          <div className="text-center py-16">
            <p className="text-[var(--color-text-secondary)] text-sm">No sets match your search.</p>
          </div>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filteredSets.map((set) => (
            <li key={set.id}>
              <Link to={`/sets/${set.id}`} className="block h-full">
                <Card className="block h-full transition-shadow duration-[var(--duration-normal)]">
                  <h2 className="font-semibold text-[var(--color-text)] truncate text-base">
                    {set.title}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mt-1.5">
                    {set.description || 'No description'}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-3">
                    {set.cards.length} card{set.cards.length !== 1 ? 's' : ''}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}

function EmptyHomeState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="max-w-md mx-auto">
        <div
          className="w-14 h-14 rounded-2xl bg-[var(--color-primary-muted)] flex items-center justify-center mx-auto mb-5"
          aria-hidden
        >
          <Search className="w-7 h-7 text-[var(--color-primary)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
          No study sets yet
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm mb-8 max-w-sm mx-auto">
          Create your first set or try demo data to see how StudyFlow works.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/sets/new">
            <Button className="w-full sm:w-auto gap-2">Create your first set</Button>
          </Link>
          <Button variant="secondary" onClick={onDemo} className="w-full sm:w-auto gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            Try demo data
          </Button>
        </div>
      </div>
    </div>
  );
}
