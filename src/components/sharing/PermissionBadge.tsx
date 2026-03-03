import { Lock, Link, Globe, Users } from 'lucide-react';
import type { SharingMode, PermissionLevel } from '../../types/sharing';
import { useTranslation } from '../../hooks/useTranslation';

interface PermissionBadgeProps {
  sharingMode?: SharingMode;
  permissionLevel?: PermissionLevel;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const modeConfig: Record<SharingMode, { 
  icon: typeof Lock; 
  label: 'private' | 'restricted' | 'linkSharing' | 'public'; 
  bgColor: string;
  textColor: string;
}> = {
  private: { 
    icon: Lock, 
    label: 'private', 
    bgColor: 'bg-red-100 dark:bg-red-900/30', 
    textColor: 'text-red-700 dark:text-red-300' 
  },
  restricted: { 
    icon: Users, 
    label: 'restricted', 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', 
    textColor: 'text-yellow-700 dark:text-yellow-300' 
  },
  link: { 
    icon: Link, 
    label: 'linkSharing', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30', 
    textColor: 'text-blue-700 dark:text-blue-300' 
  },
  public: { 
    icon: Globe, 
    label: 'public', 
    bgColor: 'bg-green-100 dark:bg-green-900/30', 
    textColor: 'text-green-700 dark:text-green-300' 
  },
};

const levelConfig: Record<PermissionLevel, { label: 'owner' | 'editor' | 'viewer'; bgColor: string; textColor: string }> = {
  owner: { 
    label: 'owner', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/30', 
    textColor: 'text-purple-700 dark:text-purple-300' 
  },
  editor: { 
    label: 'editor', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30', 
    textColor: 'text-orange-700 dark:text-orange-300' 
  },
  viewer: { 
    label: 'viewer', 
    bgColor: 'bg-gray-100 dark:bg-gray-800', 
    textColor: 'text-gray-700 dark:text-gray-300' 
  },
};

export function PermissionBadge({
  sharingMode,
  permissionLevel,
  className = '',
  showIcon = true,
  size = 'sm',
}: PermissionBadgeProps) {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  // Show permission level if provided, otherwise sharing mode
  if (permissionLevel && !sharingMode) {
    const config = levelConfig[permissionLevel];
    return (
      <span
        className={`
          inline-flex items-center gap-1 rounded-full font-medium
          ${sizeClasses[size]}
          ${config.bgColor} ${config.textColor}
          ${className}
        `}
      >
        {t(config.label)}
      </span>
    );
  }

  // Show sharing mode
  const mode = sharingMode || 'private';
  const config = modeConfig[mode];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${config.bgColor} ${config.textColor}
        ${className}
      `}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {t(config.label)}
    </span>
  );
}
