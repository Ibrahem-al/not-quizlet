import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Link, 
  Copy, 
  Check, 
  UserPlus, 
  Globe, 
  Lock, 
  Users,
  Trash2,
  AlertCircle,
  Shield,
} from 'lucide-react';
import type { SharingMode, PermissionLevel, ItemType } from '../../types/sharing';
import { useSharingStore } from '../../stores/sharingStore';
import { useTranslation } from '../../hooks/useTranslation';

interface ShareDialogProps {
  itemType: ItemType;
  itemId: string;
  itemName: string;
  sharingMode?: SharingMode;
  isOpen: boolean;
  onClose: () => void;
  onSharingModeChange?: (mode: SharingMode) => void;
}

const SHARING_MODES: { value: SharingMode; label: 'onlyYou' | 'onlyInvited' | 'anyoneWithLink' | 'public'; icon: typeof Lock; color: string }[] = [
  { value: 'private', label: 'onlyYou', icon: Lock, color: 'text-red-500' },
  { value: 'restricted', label: 'onlyInvited', icon: Users, color: 'text-yellow-500' },
  { value: 'link', label: 'anyoneWithLink', icon: Link, color: 'text-blue-500' },
  { value: 'public', label: 'public', icon: Globe, color: 'text-green-500' },
];

const PERMISSION_LEVELS: { value: PermissionLevel; label: 'viewer' | 'editor'; description: 'canView' | 'canEdit' }[] = [
  { value: 'viewer', label: 'viewer', description: 'canView' },
  { value: 'editor', label: 'editor', description: 'canEdit' },
];

export function ShareDialog({ itemType, itemId, itemName, sharingMode: initialSharingMode, isOpen, onClose, onSharingModeChange }: ShareDialogProps) {
  const { t } = useTranslation();
  const {
    shareWithUser,
    removeUserAccess,
    updateUserPermission,
    createShareLink,
    revokeShareLink,
    getShareLink,
    getItemPermissions,
    updateSharingMode,
    itemPermissions,
    isLoading,
    error,
    clearError,
  } = useSharingStore();

  const [activeTab, setActiveTab] = useState<'general' | 'people'>('general');
  const [sharingMode, setSharingMode] = useState<SharingMode>(initialSharingMode || 'private');

  // Sync sharing mode when prop changes or dialog opens
  useEffect(() => {
    if (isOpen && initialSharingMode) {
      setSharingMode(initialSharingMode);
    }
  }, [isOpen, initialSharingMode]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<PermissionLevel>('viewer');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkPermission, setLinkPermission] = useState<'editor' | 'viewer'>('viewer');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  // Get cached permissions for this item
  const permissions = useMemo(() => {
    return itemPermissions.get(`${itemType}:${itemId}`) || [];
  }, [itemPermissions, itemType, itemId]);

  // Load permissions and share link on open
  useEffect(() => {
    if (isOpen) {
      getItemPermissions(itemType, itemId);
      getShareLink(itemType, itemId).then((link) => {
        if (link) {
          setShareLink(link.token);
          setLinkPermission(link.permissionLevel);
        }
      });
    }
  }, [isOpen, itemType, itemId, getItemPermissions, getShareLink]);

  // Handle sharing mode change
  const handleModeChange = async (mode: SharingMode) => {
    setSharingMode(mode);
    try {
      await updateSharingMode(itemType, itemId, mode);
      onSharingModeChange?.(mode);
      if (mode === 'link' && !shareLink) {
        await handleCreateLink();
      }
    } catch {
      // Error handled by store
    }
  };

  // Handle invite
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await shareWithUser(itemType, itemId, inviteEmail, invitePermission);
      setInviteEmail('');
    } catch {
      // Error handled by store
    }
  };

  // Create share link
  const handleCreateLink = async () => {
    setIsCreatingLink(true);
    try {
      const token = await createShareLink(itemType, itemId, linkPermission);
      if (token) {
        setShareLink(token);
      }
    } finally {
      setIsCreatingLink(false);
    }
  };

  // Copy link
  const handleCopyLink = useCallback(() => {
    if (!shareLink) return;
    const fullUrl = `${window.location.origin}/share/${shareLink}`;
    navigator.clipboard.writeText(fullUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareLink]);

  // Remove access
  const handleRemoveAccess = async (permissionId: string) => {
    try {
      await removeUserAccess(permissionId);
    } catch {
      // Error handled by store
    }
  };

  // Update permission
  const handleUpdatePermission = async (permissionId: string, level: PermissionLevel) => {
    try {
      await updateUserPermission(permissionId, level);
    } catch {
      // Error handled by store
    }
  };

  // Revoke link
  const handleRevokeLink = async () => {
    if (!shareLink) return;
    // Need to find the link ID
    const link = await getShareLink(itemType, itemId);
    if (link) {
      try {
        await revokeShareLink(link.id);
        setShareLink(null);
      } catch {
        // Error handled by store
      }
    }
  };

  // Close handler
  const handleClose = () => {
    clearError();
    setInviteEmail('');
    setActiveTab('general');
    onClose();
  };

  const currentMode = SHARING_MODES.find((m) => m.value === sharingMode);
  const ModeIcon = currentMode?.icon || Lock;

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
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              className="bg-[var(--color-surface)] rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    {t('share')}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {itemName}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[var(--color-border)]">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                    activeTab === 'general'
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {t('general')}
                  {activeTab === 'general' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('people')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                    activeTab === 'people'
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {t('people')}
                  {activeTab === 'people' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]"
                    />
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {activeTab === 'general' ? (
                  <div className="space-y-6">
                    {/* Sharing Mode */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
                        {t('sharingSettings')}
                      </label>
                      <div className="space-y-2">
                        {SHARING_MODES.map((mode) => {
                          const Icon = mode.icon;
                          return (
                            <button
                              key={mode.value}
                              onClick={() => handleModeChange(mode.value)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                sharingMode === mode.value
                                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                              }`}
                            >
                              <Icon className={`w-5 h-5 ${mode.color}`} />
                              <span className="flex-1 text-left text-sm text-[var(--color-text-primary)]">
                                {t(mode.label)}
                              </span>
                              {sharingMode === mode.value && (
                                <Check className="w-4 h-4 text-[var(--color-primary)]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Link Sharing */}
                    {(sharingMode === 'link' || sharingMode === 'public') && (
                      <div className="border-t border-[var(--color-border)] pt-6">
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
                          {t('linkSharing')}
                        </label>

                        {shareLink ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={`${window.location.origin}/share/${shareLink}`}
                                readOnly
                                className="flex-1 px-3 py-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-secondary)]"
                              />
                              <button
                                onClick={handleCopyLink}
                                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center gap-2"
                              >
                                {linkCopied ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    {t('copied')}
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    {t('copyLink')}
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between">
                              <select
                                value={linkPermission}
                                onChange={(e) => {
                                  setLinkPermission(e.target.value as 'editor' | 'viewer');
                                  // Update link permission if needed
                                }}
                                className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm"
                              >
                                <option value="viewer">{t('anyoneCanView')}</option>
                                <option value="editor">{t('anyoneCanEdit')}</option>
                              </select>

                              <button
                                onClick={handleRevokeLink}
                                className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                              >
                                <Trash2 className="w-4 h-4" />
                                {t('deleteLink')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={handleCreateLink}
                            disabled={isCreatingLink}
                            className="w-full py-2 border border-dashed border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                          >
                            {isCreatingLink ? t('creating') : t('createLink')}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Current Access Summary */}
                    <div className="border-t border-[var(--color-border)] pt-6">
                      <div className="flex items-center gap-3 p-3 bg-[var(--color-surface-hover)] rounded-lg">
                        <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                          <ModeIcon className="w-5 h-5 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {t(currentMode?.label || 'private')}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {sharingMode === 'private' && t('onlyYou')}
                            {sharingMode === 'restricted' && t('onlyInvitedPeople')}
                            {sharingMode === 'link' && t('anyoneWithLinkCanAccess')}
                            {sharingMode === 'public' && t('anyoneCanFindAndAccess')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Invite Form */}
                    <form onSubmit={handleInvite} className="space-y-3">
                      <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                        {t('invitePeople')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder={t('enterEmail')}
                          className="flex-1 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                        />
                        <select
                          value={invitePermission}
                          onChange={(e) => setInvitePermission(e.target.value as PermissionLevel)}
                          className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm"
                        >
                          {PERMISSION_LEVELS.map((level) => (
                            <option key={level.value} value={level.value}>
                              {t(level.label)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={!inviteEmail.trim() || isLoading}
                          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </form>

                    {/* People List */}
                    <div className="border-t border-[var(--color-border)] pt-4">
                      <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                        {t('peopleWithAccess')}
                      </h4>

                      {permissions.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                          {t('noOtherPeopleHaveAccess')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center gap-3 p-3 bg-[var(--color-surface-hover)] rounded-lg"
                            >
                              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-[var(--color-primary)]">
                                  {(permission.sharedWithEmail || 'U')[0].toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                  {permission.sharedWithEmail || t('unknownUser')}
                                </p>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                  {t(permission.permissionLevel)}
                                </p>
                              </div>
                              <select
                                value={permission.permissionLevel}
                                onChange={(e) =>
                                  handleUpdatePermission(
                                    permission.id,
                                    e.target.value as PermissionLevel
                                  )
                                }
                                className="px-2 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-xs"
                              >
                                {PERMISSION_LEVELS.map((level) => (
                                  <option key={level.value} value={level.value}>
                                    {t(level.label)}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleRemoveAccess(permission.id)}
                                className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <Shield className="w-4 h-4" />
                  <span>{t('learnMoreAboutSharing')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
