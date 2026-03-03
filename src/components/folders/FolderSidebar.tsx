import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  Share2,
} from 'lucide-react';
import type { FolderTreeNode, FolderColor } from '../../types/folder';
import { FOLDER_COLORS } from '../../types/folder';
import { useFolderStore } from '../../stores/folderStore';
import { useTranslation } from '../../hooks/useTranslation';

interface FolderSidebarProps {
  currentFolderId?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  className?: string;
}

export function FolderSidebar({ currentFolderId, onFolderSelect, className = '' }: FolderSidebarProps) {
  const { t } = useTranslation();
  const { folders, folderContents, buildFolderTree, loadFolders, createFolder, deleteFolder, isLoading } = useFolderStore();
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState<FolderColor>('blue');
  const [contextMenuFolder, setContextMenuFolder] = useState<string | null>(null);

  useEffect(() => {
    if (!folders.length && !isLoading) {
      loadFolders();
    }
  }, [folders.length, isLoading, loadFolders]);

  const tree = buildFolderTree();

  const toggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    await createFolder({
      name: newFolderName,
      color: selectedColor,
    });
    
    setNewFolderName('');
    setIsCreating(false);
    setSelectedColor('blue');
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (confirm(t('confirmDeleteFolder'))) {
      await deleteFolder(folderId);
      if (currentFolderId === folderId) {
        onFolderSelect(null);
      }
    }
    setContextMenuFolder(null);
  };

  const getFolderColorClasses = (color: FolderColor) => {
    const config = FOLDER_COLORS.find((c) => c.value === color);
    return config ? `${config.bgClass} ${config.textClass}` : 'bg-blue-100 text-blue-600';
  };

  const renderFolderNode = (node: FolderTreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = currentFolderId === node.id;
    const itemCount = folderContents.get(node.id)?.length ?? node.itemCount ?? 0;

    return (
      <div key={node.id} style={{ marginLeft: depth * 12 }}>
        <div
          className={`
            group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer
            transition-colors relative
            ${isSelected 
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
            }
          `}
          onClick={() => onFolderSelect(node.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenuFolder(node.id);
          }}
        >
          {/* Expand/Collapse button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            className={`
              p-0.5 rounded hover:bg-[var(--color-surface-hover)]
              ${hasChildren ? 'visible' : 'invisible'}
            `}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
            )}
          </button>

          {/* Folder icon */}
          <div className={`p-1 rounded ${getFolderColorClasses(node.color)}`}>
            <Folder className="w-4 h-4" />
          </div>

          {/* Folder name */}
          <span className="flex-1 text-sm truncate">{node.name}</span>

          {/* Item count */}
          {itemCount > 0 && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              {itemCount}
            </span>
          )}

          {/* Context menu */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setContextMenuFolder(contextMenuFolder === node.id ? null : node.id);
            }}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[var(--color-surface-hover)] rounded"
          >
            <MoreVertical className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {contextMenuFolder === node.id && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setContextMenuFolder(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Edit folder
                      setContextMenuFolder(null);
                    }}
                    className="w-full px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t('rename')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Share folder
                      setContextMenuFolder(null);
                    }}
                    className="w-full px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    {t('share')}
                  </button>
                  <hr className="my-1 border-[var(--color-border)]" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(node.id);
                    }}
                    className="w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('delete')}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {node.children.map((child) => renderFolderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h3 className="font-semibold text-[var(--color-text-primary)]">{t('folders')}</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1.5 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
          title={t('newFolder')}
        >
          <Plus className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>
      </div>

      {/* New Folder Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-[var(--color-border)] overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t('folderName')}
                className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`
                      w-6 h-6 rounded-full transition-transform
                      ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110' : ''}
                    `}
                    style={{ backgroundColor: color.value.replace('gray', '#6b7280') }}
                    title={color.label}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] rounded-lg"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {t('create')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Sets Button */}
      <button
        onClick={() => onFolderSelect(null)}
        className={`
          flex items-center gap-2 px-4 py-2 mx-2 mt-2 rounded-lg text-sm
          ${currentFolderId === null 
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
          }
        `}
      >
        <Folder className="w-4 h-4" />
        <span>{t('allSets')}</span>
      </button>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading && folders.length === 0 ? (
          <div className="text-center py-4 text-[var(--color-text-secondary)] text-sm">
            {t('loading')}
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-4 text-[var(--color-text-secondary)] text-sm">
            {t('noFoldersYet')}
          </div>
        ) : (
          tree.map((node) => renderFolderNode(node))
        )}
      </div>
    </div>
  );
}
