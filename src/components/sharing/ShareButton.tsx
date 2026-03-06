import { useState } from 'react';
import { Lock, Link, Globe, Users } from 'lucide-react';
import type { SharingMode, ItemType } from '../../types/sharing';
import { ShareDialog } from './ShareDialog';
import { useTranslation } from '../../hooks/useTranslation';

interface ShareButtonProps {
  itemType: ItemType;
  itemId: string;
  itemName: string;
  sharingMode?: SharingMode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  onSharingModeChange?: (mode: SharingMode) => void;
}

const modeConfig: Record<SharingMode, { icon: typeof Lock; label: 'private' | 'restricted' | 'linkSharing' | 'public'; color: string }> = {
  private: { icon: Lock, label: 'private', color: 'text-red-500' },
  restricted: { icon: Users, label: 'restricted', color: 'text-yellow-500' },
  link: { icon: Link, label: 'linkSharing', color: 'text-blue-500' },
  public: { icon: Globe, label: 'public', color: 'text-green-500' },
};

export function ShareButton({
  itemType,
  itemId,
  itemName,
  sharingMode = 'private',
  className = '',
  size = 'md',
  variant = 'default',
  onSharingModeChange,
}: ShareButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const config = modeConfig[sharingMode];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const variantClasses = {
    default: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
    ghost: 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]',
    outline: 'border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`
          inline-flex items-center gap-2 rounded-lg font-medium transition-colors
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        title={t(config.label)}
      >
        <Icon className={`w-4 h-4 ${variant === 'default' ? '' : config.color}`} />
        <span className="hidden sm:inline">{t('share')}</span>
        {sharingMode !== 'private' && (
          <span className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
        )}
      </button>

      <ShareDialog
        itemType={itemType}
        itemId={itemId}
        itemName={itemName}
        sharingMode={sharingMode}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSharingModeChange={onSharingModeChange}
      />
    </>
  );
}
