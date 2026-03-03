import { motion } from 'framer-motion';
import { Globe, Lock } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface VisibilityToggleProps {
  visibility: 'private' | 'public';
  onChange: (visibility: 'private' | 'public') => void;
  disabled?: boolean;
}

export function VisibilityToggle({ visibility, onChange, disabled }: VisibilityToggleProps) {
  const { t } = useTranslation();
  const isPublic = visibility === 'public';

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--color-text)]">{t('visibility')}</span>
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          onClick={() => !disabled && onChange('private')}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-button)] border transition-all
            ${!isPublic 
              ? 'bg-[var(--color-primary-muted)] border-[var(--color-primary)] text-[var(--color-primary)]' 
              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          whileTap={!disabled ? { scale: 0.98 } : undefined}
        >
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">{t('private')}</span>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => !disabled && onChange('public')}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-button)] border transition-all
            ${isPublic 
              ? 'bg-[var(--color-primary-muted)] border-[var(--color-primary)] text-[var(--color-primary)]' 
              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          whileTap={!disabled ? { scale: 0.98 } : undefined}
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{t('public')}</span>
        </motion.button>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        {isPublic 
          ? 'Anyone can view this set. Only you can edit it.'
          : 'Only you can view and edit this set.'
        }
      </p>
    </div>
  );
}

interface VisibilityBadgeProps {
  visibility: 'private' | 'public';
}

export function VisibilityBadge({ visibility }: VisibilityBadgeProps) {
  const { t } = useTranslation();
  const isPublic = visibility === 'public';

  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${isPublic 
          ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]' 
          : 'bg-[var(--color-text-secondary)]/20 text-[var(--color-text-secondary)]'
        }`}
    >
      {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
      {isPublic ? t('public') : t('private')}
    </span>
  );
}
