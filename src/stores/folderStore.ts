import { create } from 'zustand';
import type { Folder, FolderTreeNode, CreateFolderRequest, UpdateFolderRequest } from '../types/folder';
import type { StudySet } from '../types';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';

interface FolderState {
  folders: Folder[];
  currentFolderId: string | null;
  folderContents: Map<string, StudySet[]>; // key: folderId
  isLoading: boolean;
  error: string | null;
  loaded: boolean;
}

interface FolderActions {
  // CRUD operations
  createFolder: (request: CreateFolderRequest) => Promise<Folder | null>;
  updateFolder: (id: string, updates: UpdateFolderRequest) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  
  // Loaders
  loadFolders: () => Promise<void>;
  getFolder: (id: string) => Folder | undefined;
  getFolderContents: (folderId: string) => Promise<StudySet[]>;
  getFolderPath: (folderId: string) => Promise<Folder[]>;
  buildFolderTree: () => FolderTreeNode[];
  
  // Set management
  moveSetToFolder: (setId: string, folderId: string | null) => Promise<void>;
  removeSetFromFolder: (setId: string, folderId: string) => Promise<void>;
  getSetFolder: (setId: string) => Folder | undefined;
  
  // Navigation
  setCurrentFolder: (id: string | null) => void;
  
  // Refresh
  refreshFolder: (folderId: string) => Promise<void>;
  clearError: () => void;
}

const mapDbFolderToFolder = (row: Record<string, unknown>): Folder => ({
  id: row.id as string,
  userId: row.user_id as string,
  name: row.name as string,
  description: (row.description as string) ?? '',
  parentFolderId: (row.parent_folder_id as string) ?? undefined,
  color: (row.color as Folder['color']) ?? 'blue',
  sharingMode: (row.sharing_mode as Folder['sharingMode']) ?? 'private',
  createdAt: row.created_at as number,
  updatedAt: row.updated_at as number,
});

export const useFolderStore = create<FolderState & FolderActions>((set, get) => ({
  // Initial state
  folders: [],
  currentFolderId: null,
  folderContents: new Map(),
  isLoading: false,
  error: null,
  loaded: false,

  createFolder: async (request) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');
      const now = Date.now();
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: request.name,
          description: request.description ?? '',
          parent_folder_id: request.parentFolderId ?? null,
          color: request.color ?? 'blue',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create folder');

      const folder = mapDbFolderToFolder(data);
      
      set((state) => ({
        folders: [...state.folders, folder],
      }));

      return folder;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create folder' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  updateFolder: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.parentFolderId !== undefined) updateData.parent_folder_id = updates.parentFolderId;
      if (updates.sharingMode !== undefined) updateData.sharing_mode = updates.sharingMode;
      updateData.updated_at = Date.now();

      const { error } = await supabase
        .from('folders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      set((state) => ({
        folders: state.folders.map((f) =>
          f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update folder' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteFolder: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');
      const { error } = await supabase.from('folders').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
        folderContents: (() => {
          const newMap = new Map(state.folderContents);
          newMap.delete(id);
          return newMap;
        })(),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete folder' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  loadFolders: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load from local DB first for offline support
      const localFolders = await db.getAllFolders?.() || [];
      if (localFolders.length > 0) {
        set({ folders: localFolders, loaded: true });
      }

      // Then sync with cloud
      if (!supabase) {
        set({ loaded: true });
        return;
      }
      const { data, error } = await supabase.from('folders').select('*');

      if (error) throw error;

      const folders: Folder[] = (data || []).map(mapDbFolderToFolder);

      // Count items per folder
      const foldersWithCount = await Promise.all(
        folders.map(async (folder) => {
          if (!supabase) return { ...folder, itemCount: 0 };
          const { count } = await supabase
            .from('folder_items')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', folder.id);
          return { ...folder, itemCount: count ?? 0 };
        })
      );

      set({ folders: foldersWithCount, loaded: true });

      // Save to local DB
      for (const folder of foldersWithCount) {
        await db.putFolder?.(folder);
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load folders' });
    } finally {
      set({ isLoading: false });
    }
  },

  getFolder: (id) => {
    return get().folders.find((f) => f.id === id);
  },

  getFolderContents: async (folderId) => {
    // Check cache first
    const cached = get().folderContents.get(folderId);
    if (cached) return cached;

    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('folder_items')
        .select('item_id')
        .eq('folder_id', folderId);

      if (error) throw error;

      const setIds = (data || []).map((item) => item.item_id as string);

      // Load sets
      const sets: StudySet[] = [];
      for (const id of setIds) {
        if (!supabase) continue;
        const { data: setData } = await supabase
          .from('study_sets')
          .select('*')
          .eq('id', id)
          .single();
        
        if (setData) {
          // Parse cards JSON
          const cards = typeof setData.cards === 'string' 
            ? JSON.parse(setData.cards) 
            : setData.cards || [];
          
          sets.push({
            id: setData.id,
            title: setData.title,
            description: setData.description ?? '',
            createdAt: setData.created_at,
            updatedAt: setData.updated_at,
            tags: setData.tags || [],
            cards,
            lastStudied: setData.last_studied ?? 0,
            studyStats: setData.study_stats || { totalSessions: 0, averageAccuracy: 0, streakDays: 0 },
            visibility: setData.sharing_mode === 'public' ? 'public' : 'private',
            userId: setData.user_id,
            sharingMode: setData.sharing_mode ?? 'private',
            folderId: setData.folder_id ?? undefined,
          });
        }
      }

      set((state) => {
        const newMap = new Map(state.folderContents);
        newMap.set(folderId, sets);
        return { folderContents: newMap };
      });

      return sets;
    } catch {
      return [];
    }
  },

  getFolderPath: async (folderId) => {
    const path: Folder[] = [];
    let current = get().getFolder(folderId);

    while (current) {
      path.unshift(current);
      if (current.parentFolderId) {
        const parentId = current.parentFolderId;
        current = get().getFolder(parentId);
        if (!current) {
          // Load from server if not in cache
          try {
            if (!supabase) break;
            const { data } = await supabase
              .from('folders')
              .select('*')
              .eq('id', parentId)
              .single();
            if (data) {
              current = mapDbFolderToFolder(data);
            }
          } catch {
            break;
          }
        }
      } else {
        break;
      }
    }

    return path;
  },

  buildFolderTree: () => {
    const folders = get().folders;
    const rootFolders = folders.filter((f) => !f.parentFolderId);

    const buildNode = (folder: Folder, depth: number): FolderTreeNode => {
      const children = folders
        .filter((f) => f.parentFolderId === folder.id)
        .map((f) => buildNode(f, depth + 1));

      return {
        ...folder,
        children,
        depth,
      };
    };

    return rootFolders.map((f) => buildNode(f, 0));
  },

  moveSetToFolder: async (setId, folderId) => {
    if (!supabase) throw new Error('Not authenticated');
    set({ isLoading: true, error: null });
    try {
      // Remove from current folder if any
      const { data: existing } = await supabase
        .from('folder_items')
        .select('id, folder_id')
        .eq('item_id', setId)
        .maybeSingle();

      if (existing) {
        await supabase.from('folder_items').delete().eq('id', existing.id);
      }

      // Add to new folder
      if (folderId) {
        const { error } = await supabase.from('folder_items').insert({
          folder_id: folderId,
          item_type: 'set',
          item_id: setId,
          added_at: Date.now(),
          added_by: (await supabase.auth.getUser()).data.user?.id,
        });

        if (error) throw error;
      }

      // Update study_set folder_id
      const { error: updateError } = await supabase
        .from('study_sets')
        .update({ folder_id: folderId })
        .eq('id', setId);

      if (updateError) throw updateError;

      // Refresh caches
      if (existing?.folder_id) {
        await get().refreshFolder(existing.folder_id as string);
      }
      if (folderId) {
        await get().refreshFolder(folderId);
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to move set' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  removeSetFromFolder: async (setId, folderId) => {
    if (!supabase) throw new Error('Not authenticated');
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('folder_items')
        .delete()
        .eq('folder_id', folderId)
        .eq('item_id', setId);

      if (error) throw error;

      // Update study_set folder_id to null
      await supabase
        .from('study_sets')
        .update({ folder_id: null })
        .eq('id', setId);

      await get().refreshFolder(folderId);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to remove set' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  getSetFolder: (setId) => {
    const { folders, folderContents } = get();
    
    for (const [folderId, sets] of folderContents.entries()) {
      if (sets.some((s) => s.id === setId)) {
        return folders.find((f) => f.id === folderId);
      }
    }
    
    return undefined;
  },

  setCurrentFolder: (id) => set({ currentFolderId: id }),

  refreshFolder: async (folderId) => {
    const contents = await get().getFolderContents(folderId);
    set((state) => {
      const newMap = new Map(state.folderContents);
      newMap.set(folderId, contents);
      return { folderContents: newMap };
    });
  },

  clearError: () => set({ error: null }),
}));
