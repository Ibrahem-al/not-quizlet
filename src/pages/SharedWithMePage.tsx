import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Folder,
  BookOpen,
  Search,
  Clock,
  ChevronRight,
  SortAsc,
} from 'lucide-react';
import { useSharingStore } from '../stores/sharingStore';
import { useTranslation } from '../hooks/useTranslation';
import { Input } from '../components/ui/Input';
import { PermissionBadge } from '../components/sharing/PermissionBadge';
import { AppLayout } from '../components/layout/AppLayout';
import type { PendingInvite } from '../types/sharing';

interface SharedItem extends PendingInvite {
  itemName: string;
  itemDescription?: string;
  sharedByName?: string;
}

type FilterType = 'all' | 'sets' | 'folders';
type SortType = 'newest' | 'oldest' | 'name';

export default function SharedWithMePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loadPendingInvites, pendingInvites, isLoading } = useSharingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');

  useEffect(() => {
    loadPendingInvites();
  }, [loadPendingInvites]);

  // Transform invites to shared items (would need to fetch item details in real app)
  const sharedItems: SharedItem[] = useMemo(() => {
    return pendingInvites.map((invite) => ({
      ...invite,
      // These would come from a join query in real implementation
      itemName: invite.itemType === 'set' ? t('untitledSet') : t('untitledFolder'),
      sharedByName: invite.sharedByEmail || t('unknownUser'),
    }));
  }, [pendingInvites, t]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = [...sharedItems];

    // Apply type filter
    if (filter !== 'all') {
      items = items.filter((item) => item.itemType === filter.slice(0, -1));
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.itemName?.toLowerCase().includes(query) ||
          item.sharedByName?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    items.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return b.sharedAt - a.sharedAt;
        case 'oldest':
          return a.sharedAt - b.sharedAt;
        case 'name':
          return (a.itemName || '').localeCompare(b.itemName || '');
        default:
          return 0;
      }
    });

    return items;
  }, [sharedItems, filter, searchQuery, sort]);

  const handleItemClick = (item: SharedItem) => {
    if (item.itemType === 'set') {
      navigate(`/sets/${item.itemId}`);
    } else {
      navigate(`/folders/${item.itemId}`);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <AppLayout breadcrumbs={[{ label: t('sharedWithMe') }]}>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            {t('sharedWithMe')}
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {t('itemsSharedWithYouDescription')}
          </p>
        </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchSharedItems')}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center bg-[var(--color-surface-hover)] rounded-lg p-1">
            {(['all', 'sets', 'folders'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {t(f)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="appearance-none px-3 py-1.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-sm pr-8 cursor-pointer"
            >
              <option value="newest">{t('newestFirst')}</option>
              <option value="oldest">{t('oldestFirst')}</option>
              <option value="name">{t('alphabetical')}</option>
            </select>
            <SortAsc className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading && sharedItems.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--color-text-secondary)]">{t('loading')}</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-[var(--color-text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
            {searchQuery ? t('noResults') : t('noSharedItems')}
          </h3>
          <p className="text-[var(--color-text-secondary)] max-w-md mx-auto">
            {searchQuery
              ? t('tryAdjustingSearch')
              : t('whenSomeoneSharesItems')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleItemClick(item)}
              className="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)]/50 hover:shadow-sm transition-all cursor-pointer group"
            >
              {/* Icon */}
              <div className="p-3 bg-[var(--color-primary)]/10 rounded-xl group-hover:bg-[var(--color-primary)]/20 transition-colors">
                {item.itemType === 'set' ? (
                  <BookOpen className="w-6 h-6 text-[var(--color-primary)]" />
                ) : (
                  <Folder className="w-6 h-6 text-[var(--color-primary)]" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[var(--color-text-primary)] truncate">
                  {item.itemName}
                </h4>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <span>{item.sharedByName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.sharedAt)}
                  </span>
                </div>
              </div>

              {/* Permission Badge */}
              <PermissionBadge permissionLevel={item.permissionLevel} size="sm" />

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </motion.div>
          ))}
        </div>
      )}

        {/* Stats */}
        {filteredItems.length > 0 && (
          <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
            {t('showing')} {filteredItems.length} {t(filteredItems.length === 1 ? 'item' : 'items')}
            {searchQuery && ` ${t('matching')} "${searchQuery}"`}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
