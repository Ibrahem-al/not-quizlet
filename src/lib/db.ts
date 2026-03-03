import Dexie, { type Table } from 'dexie';
import type { StudySet, Settings } from '../types';
import type { Folder, FolderItem } from '../types/folder';

/**
 * IndexedDB via Dexie. Database name: StudyFlowDB.
 * Denormalized: sets store holds full StudySet with embedded cards.
 */
class StudyFlowDB extends Dexie {
  sets!: Table<StudySet, string>;
  sessions!: Table<{ id?: number; setId: string; startedAt: number; [key: string]: unknown }, number>;
  settings!: Table<Settings, number>;
  folders!: Table<Folder, string>;
  folderItems!: Table<FolderItem, string>;

  constructor() {
    super('StudyFlowDB');
    this.version(1).stores({
      sets: 'id, updatedAt, createdAt',
      sessions: '++id, setId, startedAt',
      settings: '++id',
    });
    // Migration for folders (version 2)
    this.version(2).stores({
      sets: 'id, updatedAt, createdAt, folderId',
      sessions: '++id, setId, startedAt',
      settings: '++id',
      folders: 'id, userId, parentFolderId, updatedAt',
      folderItems: 'id, folderId, itemId',
    });
  }
}

export const db = new StudyFlowDB();

export async function getAllSets(): Promise<StudySet[]> {
  return db.sets.toArray();
}

export async function getSet(id: string): Promise<StudySet | undefined> {
  return db.sets.get(id);
}

export async function putSet(set: StudySet): Promise<string> {
  await db.sets.put(set);
  return set.id;
}

export async function deleteSet(id: string): Promise<void> {
  await db.sets.delete(id);
}

export async function getSettings(): Promise<Settings | undefined> {
  const first = await db.settings.toCollection().first();
  return first;
}

export async function putSettings(settings: Settings): Promise<number> {
  const id = settings.id ?? (await db.settings.toCollection().first())?.id;
  if (id != null) {
    await db.settings.put({ ...settings, id });
    return id;
  }
  return db.settings.add(settings);
}

// Folder methods
export async function getAllFolders(): Promise<Folder[]> {
  return db.folders?.toArray() ?? [];
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  return db.folders?.get(id);
}

export async function putFolder(folder: Folder): Promise<string> {
  await db.folders?.put(folder);
  return folder.id;
}

export async function deleteFolder(id: string): Promise<void> {
  await db.folders?.delete(id);
}

export async function getFolderItems(folderId: string): Promise<FolderItem[]> {
  return db.folderItems?.where('folderId').equals(folderId).toArray() ?? [];
}

export async function putFolderItem(item: FolderItem): Promise<string> {
  await db.folderItems?.put(item);
  return item.id;
}

export async function deleteFolderItem(id: string): Promise<void> {
  await db.folderItems?.delete(id);
}
