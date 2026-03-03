/**
 * Folder types for organizing study sets
 */
import type { SharingMode } from './sharing';

/**
 * A folder for organizing study sets
 */
export interface Folder {
  id: string;
  userId: string;
  name: string;
  description: string;
  parentFolderId?: string | null;
  color: FolderColor;
  sharingMode: SharingMode;
  createdAt: number;
  updatedAt: number;
  itemCount?: number; // Computed field
}

/**
 * Colors available for folders
 */
export type FolderColor = 
  | 'blue' 
  | 'green' 
  | 'purple' 
  | 'red' 
  | 'orange' 
  | 'yellow' 
  | 'pink' 
  | 'teal' 
  | 'gray';

/**
 * An item (set) inside a folder
 */
export interface FolderItem {
  id: string;
  folderId: string;
  itemType: 'set';
  itemId: string;
  addedAt: number;
  addedBy: string;
}

/**
 * Folder with breadcrumb path
 */
export interface FolderWithPath extends Folder {
  path: Folder[]; // Parent folders from root to this folder
}

/**
 * Folder tree node for sidebar display
 */
export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  depth: number;
}

/**
 * Create folder request
 */
export interface CreateFolderRequest {
  name: string;
  description?: string;
  parentFolderId?: string;
  color?: FolderColor;
}

/**
 * Update folder request
 */
export interface UpdateFolderRequest {
  name?: string;
  description?: string;
  color?: FolderColor;
  parentFolderId?: string | null; // null to move to root
  sharingMode?: SharingMode;
}

/**
 * Move set to folder request
 */
export interface MoveSetRequest {
  setId: string;
  targetFolderId: string | null; // null to remove from all folders
  sourceFolderId?: string; // if moving between folders
}

/**
 * Available folder colors with display info
 */
export const FOLDER_COLORS: { value: FolderColor; label: string; bgClass: string; textClass: string }[] = [
  { value: 'blue', label: 'Blue', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-600 dark:text-blue-400' },
  { value: 'green', label: 'Green', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-600 dark:text-green-400' },
  { value: 'purple', label: 'Purple', bgClass: 'bg-purple-100 dark:bg-purple-900/30', textClass: 'text-purple-600 dark:text-purple-400' },
  { value: 'red', label: 'Red', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-600 dark:text-red-400' },
  { value: 'orange', label: 'Orange', bgClass: 'bg-orange-100 dark:bg-orange-900/30', textClass: 'text-orange-600 dark:text-orange-400' },
  { value: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', textClass: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'pink', label: 'Pink', bgClass: 'bg-pink-100 dark:bg-pink-900/30', textClass: 'text-pink-600 dark:text-pink-400' },
  { value: 'teal', label: 'Teal', bgClass: 'bg-teal-100 dark:bg-teal-900/30', textClass: 'text-teal-600 dark:text-teal-400' },
  { value: 'gray', label: 'Gray', bgClass: 'bg-gray-100 dark:bg-gray-800', textClass: 'text-gray-600 dark:text-gray-400' },
];
