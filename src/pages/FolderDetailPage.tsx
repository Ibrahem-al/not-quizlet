import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Folder,
  MoreVertical,
  Edit2,
  Trash2,
  Plus,
  Search,
  LayoutGrid,
  List,
  BookOpen,
  Layers,
} from 'lucide-react';
import type { StudySet } from '../types';
import { FOLDER_COLORS } from '../types/folder';
import { useFolderStore } from '../stores/folderStore';
import { useStudyStore } from '../stores/studyStore';
import { useTranslation } from '../hooks/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { ShareButton } from '../components/sharing/ShareButton';
import { PermissionBadge } from '../components/sharing/PermissionBadge';
import { Card } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AppLayout } from '../components/layout/AppLayout';

export default function FolderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  
  const { 
    getFolder, 
    getFolderContents, 
    getFolderPath, 
    deleteFolder, 
    updateFolder,
    isLoading: folderLoading 
  } = useFolderStore();
  
  const { loadSets } = useStudyStore();

  const [folderPath, setFolderPath] = useState<Awaited<ReturnType<typeof getFolderPath>>>([]);
  const [contents, setContents] = useState<StudySet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showActions, setShowActions] = useState(false);

  const folder = id ? getFolder(id) : undefined;
  const isOwner = folder?.userId === user?.id;

  // Load folder data
  useEffect(() => {
    if (id) {
      Promise.all([
        getFolderPath(id).then(setFolderPath),
        getFolderContents(id).then(setContents),
        loadSets(),
      ]);
    }
  }, [id, getFolderPath, getFolderContents, loadSets]);

  // Update edit fields when folder loads
  useEffect(() => {
    if (folder) {
      setEditName(folder.name);
      setEditDescription(folder.description);
    }
  }, [folder]);

  // Filter contents by search
  const filteredContents = useMemo(() => {
    if (!searchQuery.trim()) return contents;
    const query = searchQuery.toLowerCase();
    return contents.filter(
      (set) =>
        set.title.toLowerCase().includes(query) ||
        set.description.toLowerCase().includes(query) ||
        set.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [contents, searchQuery]);

  const getFolderColorClasses = () => {
    const config = FOLDER_COLORS.find((c) => c.value === folder?.color);
    return config ? `${config.bgClass} ${config.textClass}` : 'bg-blue-100 text-blue-600';
  };

  const handleDelete = async () => {
    if (!folder) return;
    if (confirm(t('confirmDeleteFolder'))) {
      await deleteFolder(folder.id);
      navigate('/');
    }
  };

  const handleSaveEdit = async () => {
    if (!folder || !editName.trim()) return;
    await updateFolder(folder.id, {
      name: editName,
      description: editDescription,
    });
    setIsEditing(false);
  };

  if (!folder && folderLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[var(--color-text-secondary)]">{t('loading')}</div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Folder className="w-16 h-16 text-[var(--color-text-secondary)] mb-4" />
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          {t('folderNotFound')}
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-4">{t('folderMayHaveBeenDeleted')}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          {t('goHome')}
        </Button>
      </div>
    );
  }

  // Build breadcrumbs for AppLayout
  const breadcrumbs = [
    { label: t('home'), href: '/' },
    ...folderPath.map((parent) => ({
      label: parent.name,
      href: `/folders/${parent.id}`,
    })),
    { label: folder.name },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${getFolderColorClasses()}`}>
              <Folder className="w-8 h-8" />
            </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1 w-full max-w-md"
                  autoFocus
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('description')}
                  className="text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1 w-full max-w-md"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} size="sm">
                    {t('save')}
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm">
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {folder.name}
                </h1>
                {folder.description && (
                  <p className="text-[var(--color-text-secondary)] mt-1">
                    {folder.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <PermissionBadge sharingMode={folder.sharingMode} size="sm" />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {contents.length} {t(contents.length === 1 ? 'set' : 'sets')}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-2">
            <ShareButton
              itemType="folder"
              itemId={folder.id}
              itemName={folder.name}
              sharingMode={folder.sharingMode}
            />

            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>

                {showActions && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowActions(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1"
                    >
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        {t('rename')}
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Change color
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
                      >
                        <Folder className="w-4 h-4" />
                        {t('changeColor')}
                      </button>
                      <hr className="my-1 border-[var(--color-border)]" />
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('deleteFolder')}
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchSets')}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {isOwner && (
          <Button onClick={() => navigate('/sets/new')} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('newSet')}
          </Button>
        )}
      </div>

      {/* Sets Grid/List */}
      {filteredContents.length === 0 ? (
        <div className="text-center py-16">
          <Folder className="w-16 h-16 text-[var(--color-text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
            {searchQuery ? t('noSetsMatchSearch') : t('folderEmpty')}
          </h3>
          <p className="text-[var(--color-text-secondary)] mb-4">
            {searchQuery
              ? t('tryDifferentSearch')
              : t('addSetsToFolder')}
          </p>
          {isOwner && !searchQuery && (
            <Button onClick={() => navigate('/sets/new')}>
              <Plus className="w-4 h-4 mr-2" />
              {t('createNewSet')}
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {filteredContents.map((set) => (
            <Link key={set.id} to={`/sets/${set.id}`} className="block h-full">
              <Card className="block h-full group">
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
              </Card>
            </Link>
          ))}
        </div>
      )}
      </div>
    </AppLayout>
  );
}
