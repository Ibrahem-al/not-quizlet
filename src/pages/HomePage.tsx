import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Search, Download, Upload, MoreVertical, BarChart3, BookOpen, Layers, Trash2, X, Moon, Sun, Languages } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AppLayout, NewSetButton } from '../components/layout/AppLayout';
import { FolderSidebar } from '../components/folders/FolderSidebar';
import { useStudyStore } from '../stores/studyStore';
import { useFolderStore } from '../stores/folderStore';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useLanguageStore } from '../stores/languageStore';
import { useTranslation } from '../hooks/useTranslation';

function ThemeToggleMenuItem({ onClose }: { onClose: () => void }) {
  const { theme, toggleTheme } = useThemeStore();
  const { t } = useTranslation();
  
  return (
    <button
      type="button"
      className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] flex items-center gap-2.5 transition-colors"
      role="menuitem"
      onClick={() => {
        toggleTheme();
        onClose();
      }}
      title={theme === 'dark' ? t('light') : t('dark')}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 shrink-0 text-amber-500" />
      ) : (
        <Moon className="w-4 h-4 shrink-0 text-indigo-500" />
      )}
      {theme === 'dark' ? t('light') : t('dark')} {t('theme').toLowerCase()}
    </button>
  );
}

function LanguageToggleMenuItem({ onClose }: { onClose: () => void }) {
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();
  
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };
  
  return (
    <button
      type="button"
      className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] flex items-center gap-2.5 transition-colors"
      role="menuitem"
      onClick={() => {
        toggleLanguage();
        onClose();
      }}
      title={t('language')}
    >
      <Languages className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
      {language === 'en' ? 'العربية' : 'English'}
    </button>
  );
}

export function HomePage() {
  const { sets, loadSets, loadSettings, loaded, deleteSet } = useStudyStore();
  const { currentFolderId, setCurrentFolder, loadFolders } = useFolderStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [importFile, setImportFile] = useState<HTMLInputElement | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [setToDelete, setSetToDelete] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    loadSets();
    loadSettings();
    loadFolders();
  }, [loadSets, loadSettings, loadFolders]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // Filter by folder first, then search
  const setsInFolder = useMemo(() => {
    if (!currentFolderId) return sets;
    return sets.filter((s) => s.folderId === currentFolderId);
  }, [sets, currentFolderId]);

  const fuse = useMemo(
    () =>
      new Fuse(setsInFolder, {
        keys: ['title', 'tags', 'cards.term'],
        threshold: 0.3,
      }),
    [setsInFolder]
  );
  const filteredSets = useMemo(() => {
    if (!search.trim()) return setsInFolder;
    return fuse.search(search).map((r) => r.item);
  }, [setsInFolder, search, fuse]);

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
    <div className="flex items-center gap-2">
      <div className="relative min-w-[180px] max-w-[260px]">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none"
          aria-hidden
        />
        <input
          type="text"
          placeholder="Search sets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all duration-[var(--duration-fast)] hover:border-[var(--color-border-hover)]"
          aria-label="Search sets"
        />
      </div>
      <div className="relative" ref={moreRef}>
        <Button
          variant="secondary"
          size="sm"
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
            className="absolute right-0 top-full mt-2 py-1.5 min-w-[200px] rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] z-20 animate-fade-in"
            role="menu"
          >
            <Link
              to="/stats"
              className="block w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] flex items-center gap-2.5 rounded-t-[var(--radius-sm)] transition-colors"
              role="menuitem"
              onClick={() => setMoreOpen(false)}
              title="View analytics"
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-[var(--color-text-secondary)]" /> Stats
            </Link>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] flex items-center gap-2.5 transition-colors"
              role="menuitem"
              onClick={handleExport}
              title="Download backup as JSON"
            >
              <Download className="w-4 h-4 shrink-0 text-[var(--color-success)]" /> Export backup
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] flex items-center gap-2.5 transition-colors"
              role="menuitem"
              onClick={() => importFile?.click()}
              title="Restore from JSON backup"
            >
              <Upload className="w-4 h-4 shrink-0 text-[var(--color-primary)]" /> Import backup
            </button>
            <div className="border-t border-[var(--color-border)] my-1" />
            <ThemeToggleMenuItem onClose={() => setMoreOpen(false)} />
            <LanguageToggleMenuItem onClose={() => setMoreOpen(false)} />
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
    <AppLayout 
      headerRight={headerRight}
      sidebar={<FolderSidebar currentFolderId={currentFolderId} onFolderSelect={setCurrentFolder} />}
    >
      {!loaded ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        sets.length === 0 ? (
          <EmptyHomeState />
        ) : (
          <div className="text-center py-16">
            <p className="text-[var(--color-text-secondary)] text-base">No sets match your search.</p>
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-[var(--color-primary)] hover:underline text-sm font-medium"
            >
              Clear search
            </button>
          </div>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filteredSets.map((set) => (
            <li key={set.id} className="group">
              <Card className="h-full relative">
                <Link to={`/sets/${set.id}`} className="block h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-[var(--color-text)] truncate text-base group-hover:text-[var(--color-primary)] transition-colors">
                        {set.title}
                      </h2>
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mt-1.5">
                        {set.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                      <Layers className="w-3.5 h-3.5" />
                      <span className="font-medium">{set.cards.length} card{set.cards.length !== 1 ? 's' : ''}</span>
                    </div>
                    {set.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {set.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                        {set.tags.length > 2 && (
                          <span className="text-xs text-[var(--color-text-tertiary)]">
                            +{set.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
                {/* Delete button - visible on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSetToDelete({ id: set.id, title: set.title });
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-[var(--color-surface)] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="Delete set"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={!!setToDelete}
        title="Delete this set?"
        body={setToDelete ? `Are you sure you want to delete "${setToDelete.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          if (setToDelete) {
            deleteSet(setToDelete.id);
            setSetToDelete(null);
          }
        }}
        onCancel={() => setSetToDelete(null)}
      />
    </AppLayout>
  );
}

function EmptyHomeState() {
  return (
    <div className="text-center py-20 px-4">
      <div className="max-w-md mx-auto">
        <div
          className="w-16 h-16 rounded-2xl bg-[var(--gradient-primary)] flex items-center justify-center mx-auto mb-6 shadow-lg"
          aria-hidden
        >
          <Layers className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text)] mb-3 tracking-tight">
          Welcome to StudyFlow
        </h2>
        <p className="text-[var(--color-text-secondary)] text-base mb-8 max-w-sm mx-auto leading-relaxed">
          Create your own flashcard sets to start learning smarter.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/sets/new">
            <Button className="w-full sm:w-auto gap-2 shadow-lg">Create your first set</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
