/**
 * Sharing types for granular permissions
 * Google Docs-style sharing system
 */

export type SharingMode = 'private' | 'restricted' | 'link' | 'public';
export type PermissionLevel = 'owner' | 'editor' | 'viewer';
export type ItemType = 'set' | 'folder';

/**
 * A direct user-to-user sharing permission
 */
export interface SharePermission {
  id: string;
  itemType: ItemType;
  itemId: string;
  sharedWithUserId?: string;
  sharedWithEmail?: string; // For pending invites
  permissionLevel: PermissionLevel;
  sharedByUserId: string;
  sharedAt: number;
  expiresAt?: number;
}

/**
 * A shareable link for unlisted access
 */
export interface ShareLink {
  id: string;
  itemType: ItemType;
  itemId: string;
  token: string;
  permissionLevel: 'editor' | 'viewer';
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  accessCount: number;
  maxUses?: number;
}

/**
 * User info for displaying shared users
 */
export interface SharedUser {
  userId: string;
  email: string;
  permissionLevel: PermissionLevel;
  sharedAt: number;
}

/**
 * Sharing settings for an item
 */
export interface SharingSettings {
  sharingMode: SharingMode;
  permissions: SharePermission[];
  shareLinks: ShareLink[];
  effectivePermission?: PermissionLevel;
}

/**
 * Pending share invite
 */
export interface PendingInvite {
  id: string;
  itemType: ItemType;
  itemId: string;
  itemName: string;
  sharedByEmail: string;
  sharedByUserId: string;
  permissionLevel: PermissionLevel;
  sharedAt: number;
  expiresAt?: number;
}
