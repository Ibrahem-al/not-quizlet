import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Search, BookOpen, Layers, Globe, User } from 'lucide-react';
import { Card, Button, SkeletonCard } from '../components/ui';
import { AppLayout } from '../components/layout/AppLayout';
import { VisibilityBadge } from '../components/ui/VisibilityToggle';
import { useStudyStore } from '../stores/studyStore';
import { useTranslation } from '../hooks/useTranslation';

export function PublicSetsPage() {
  const { t } = useTranslation();
  const { publicSets, loadPublicSets, publicSetsLoaded } = useStudyStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPublicSets();
  }, [loadPublicSets]);

  const fuse = useMemo(
    () =>
      new Fuse(publicSets, {
        keys: ['title', 'description', 'tags', 'cards.term'],
        threshold: 0.3,
      }),
    [publicSets]
  );

  const filteredSets = useMemo(() => {
    if (!search.trim()) return publicSets;
    return fuse.search(search).map((r) => r.item);
  }, [publicSets, search, fuse]);

  const headerRight = (
    <div className="relative flex-1 sm:flex-initial min-w-[180px] max-w-[260px]">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none"
        aria-hidden
      />
      <input
        type="text"
        placeholder={t('searchSets')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all duration-[var(--duration-fast)] hover:border-[var(--color-border-hover)]"
        aria-label="Search public sets"
      />
    </div>
  );

  return (
    <AppLayout breadcrumbs={[{ label: t('explore') }]} headerRight={headerRight}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-[var(--color-primary)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">
            {t('explore')}
          </h1>
        </div>
        <p className="text-[var(--color-text-secondary)]">
          Discover and study public flashcard sets created by the community.
        </p>

        {!publicSetsLoaded ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
            {publicSets.length === 0 ? (
              <>
                <p className="text-[var(--color-text-secondary)] text-base mb-2">
                  No public sets available yet.
                </p>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  Be the first to create and share a public study set!
                </p>
                <Link to="/sets/new" className="mt-4 inline-block">
                  <Button>{t('newSet')}</Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-[var(--color-text-secondary)] text-base">
                  No sets match your search.
                </p>
                <button
                  onClick={() => setSearch('')}
                  className="mt-3 text-[var(--color-primary)] hover:underline text-sm font-medium"
                >
                  Clear search
                </button>
              </>
            )}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {filteredSets.map((set) => (
              <li key={set.id}>
                <Link to={`/sets/${set.id}`} className="block h-full">
                  <Card className="block h-full group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-[var(--color-text)] truncate text-base group-hover:text-[var(--color-primary)] transition-colors">
                          {set.title || 'Untitled set'}
                        </h2>
                        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mt-1.5">
                          {set.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex-shrink-0 w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <VisibilityBadge visibility={set.visibility} />
                    </div>
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--color-border)]">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                        <Layers className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {set.cards.length} {set.cards.length === 1 ? 'card' : 'cards'}
                        </span>
                      </div>
                      {set.userId && (
                        <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                          <User className="w-3.5 h-3.5" />
                          <span className="font-medium">{t('owner')}</span>
                        </div>
                      )}
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
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
