import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, ChevronRight, FolderOpen } from 'lucide-react';
import type { Folder as FolderType, FolderTreeNode } from '../../types/folder';
import { FOLDER_COLORS } from '../../types/folder';
import { useFolderStore } from '../../stores/folderStore';
import { useTranslation } from '../../hooks/useTranslation';

interface MoveToFolderDialogProps {
  setId: string;
  setName: string;
  currentFolderId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onMove?: (folderId: string | null) => void;
}

export function MoveToFolderDialog({
  setId,
  setName,
  currentFolderId,
  isOpen,
  onClose,
  onMove,
}: MoveToFolderDialogProps) {
  const { t } = useTranslation();
  const { folders, buildFolderTree, moveSetToFolder, loadFolders, isLoading } = useFolderStore();
  
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
      setSelectedFolderId(currentFolderId ?? null);
    }
  }, [isOpen, currentFolderId, loadFolders]);

  const tree = buildFolderTree();

  const handleMove = async () => {
    if (selectedFolderId === currentFolderId) {
      onClose();
      return;
    }

    setIsMoving(true);
    try {
      await moveSetToFolder(setId, selectedFolderId);
      onMove?.(selectedFolderId);
      onClose();
    } catch {
      // Error handled by store
    } finally {
      setIsMoving(false);
    }
  };

  const getFolderColorClasses = (color: FolderType['color']) => {
    const config = FOLDER_COLORS.find((c) => c.value === color);
    return config ? `${config.bgClass} ${config.textClass}` : 'bg-blue-100 text-blue-600';
  };

  const renderFolderNode = (node: FolderTreeNode, depth: number = 0) => {
    const isSelected = selectedFolderId === node.id;
    const isCurrent = currentFolderId === node.id;

    return (
      <div key={node.id}>
        <button
          onClick={() => setSelectedFolderId(node.id)}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
            transition-colors
            ${isSelected 
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' 
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
            }
          `}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          <div className={`p-1 rounded ${getFolderColorClasses(node.color)}`}>
            {isSelected ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )}
          </div>
          <span className="flex-1 text-sm truncate">{node.name}</span>
          {isCurrent && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              {t('current')}
            </span>
          )}
          {isSelected && !isCurrent && (
            <ChevronRight className="w-4 h-4 text-[var(--color-primary)]" />
          )}
        </button>
        {node.children.length > 0 && (
          <div>
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              className="bg-[var(--color-surface)] rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {t('moveToFolder')}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {setName}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* No Folder Option */}
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left mb-2
                    transition-colors
                    ${selectedFolderId === null
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' 
                      : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                    }
                  `}
                >
                  <div className="p-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    <Folder className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm">{t('noFolder')}</span>
                  {currentFolderId === null && selectedFolderId === null && (
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {t('current')}
                    </span>
                  )}
                </button>

                <hr className="my-3 border-[var(--color-border)]" />

                {/* Folder Tree */}
                {isLoading && folders.length === 0 ? (
                  <div className="text-center py-8 text-[var(--color-text-secondary)]">
                    {t('loading')}
                  </div>
                ) : tree.length === 0 ? (
                  <div className="text-center py-8 text-[var(--color-text-secondary)]">
                    {t('noFoldersYet')}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {tree.map((node) => renderFolderNode(node))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleMove}
                    disabled={isMoving || selectedFolderId === currentFolderId}
                    className="flex-1 px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
                  >
                    {isMoving ? t('moving') : t('move')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
