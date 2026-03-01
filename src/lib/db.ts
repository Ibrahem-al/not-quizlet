import Dexie, { type Table } from 'dexie';
import type { StudySet, Settings } from '../types';

/**
 * IndexedDB via Dexie. Database name: StudyFlowDB.
 * Denormalized: sets store holds full StudySet with embedded cards.
 */
class StudyFlowDB extends Dexie {
  sets!: Table<StudySet, string>;
  sessions!: Table<{ id?: number; setId: string; startedAt: number; [key: string]: unknown }, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super('StudyFlowDB');
    this.version(1).stores({
      sets: 'id, updatedAt, createdAt',
      sessions: '++id, setId, startedAt',
      settings: '++id',
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
