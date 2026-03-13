import { create } from 'zustand';
import type {
  SharePermission,
  ShareLink,
  SharingMode,
  PermissionLevel,
  ItemType,
  PendingInvite,
} from '../types/sharing';
import { supabase } from '../lib/supabase';
import { useStudyStore } from './studyStore';

interface SharingState {
  // Cache
  itemPermissions: Map<string, SharePermission[]>; // key: `${itemType}:${itemId}`
  itemShareLinks: Map<string, ShareLink[]>; // key: `${itemType}:${itemId}`
  pendingInvites: PendingInvite[];
  isLoading: boolean;
  error: string | null;
}

interface SharingActions {
  // CRUD operations
  shareWithUser: (
    itemType: ItemType,
    itemId: string,
    email: string,
    permissionLevel: PermissionLevel,
    expiresAt?: number
  ) => Promise<void>;
  removeUserAccess: (permissionId: string) => Promise<void>;
  updateUserPermission: (
    permissionId: string,
    permissionLevel: PermissionLevel
  ) => Promise<void>;
  
  // Share links
  createShareLink: (
    itemType: ItemType,
    itemId: string,
    permissionLevel: 'editor' | 'viewer',
    options?: { expiresAt?: number; maxUses?: number }
  ) => Promise<string | null>;
  revokeShareLink: (linkId: string) => Promise<void>;
  getShareLink: (itemType: ItemType, itemId: string) => Promise<ShareLink | null>;
  
  // Getters
  getItemPermissions: (itemType: ItemType, itemId: string) => Promise<SharePermission[]>;
  updateSharingMode: (itemType: ItemType, itemId: string, mode: SharingMode) => Promise<void>;
  getEffectivePermission: (
    itemType: ItemType,
    itemId: string
  ) => Promise<PermissionLevel | null>;
  
  // Accept share
  acceptShareLink: (token: string) => Promise<{ itemType: ItemType; itemId: string } | null>;
  loadPendingInvites: () => Promise<void>;
  
  // Clear cache
  clearCache: (itemType: ItemType, itemId: string) => void;
  clearError: () => void;
}

export const useSharingStore = create<SharingState & SharingActions>((set, get) => ({
  // Initial state
  itemPermissions: new Map(),
  itemShareLinks: new Map(),
  pendingInvites: [],
  isLoading: false,
  error: null,

  shareWithUser: async (itemType, itemId, email, permissionLevel, expiresAt) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');

      // Get current user for shared_by_user_id (required NOT NULL column)
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.from('sharing_permissions').insert({
        item_type: itemType,
        item_id: itemId,
        shared_with_email: email,
        shared_by_user_id: userData.user.id,
        permission_level: permissionLevel,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      if (error) throw error;

      // Ensure the item's sharing_mode allows shared access
      // (private mode blocks all shared reads via RLS)
      const table = itemType === 'set' ? 'study_sets' : 'folders';
      const { data: item } = await supabase
        .from(table)
        .select('sharing_mode')
        .eq('id', itemId)
        .single();
      if (item && item.sharing_mode === 'private') {
        await get().updateSharingMode(itemType, itemId, 'restricted');
      }

      // Refresh permissions
      await get().getItemPermissions(itemType, itemId);
    } catch (err) {
      console.error('[sharingStore] shareWithUser failed:', err);
      const raw = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Failed to share';
      const friendly = raw.includes('relation') && raw.includes('does not exist')
        ? 'Database migration required — run migration 007 in the Supabase SQL Editor.'
        : raw || 'Failed to share';
      set({ error: friendly });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  removeUserAccess: async (permissionId) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('sharing_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      // Optimistically remove from cache so the list updates immediately
      set((state) => {
        const newMap = new Map(state.itemPermissions);
        for (const [key, perms] of newMap) {
          newMap.set(key, perms.filter((p) => p.id !== permissionId));
        }
        return { itemPermissions: newMap };
      });
    } catch (err) {
      console.error('[sharingStore] removeUserAccess failed:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to remove access' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateUserPermission: async (permissionId, permissionLevel) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('sharing_permissions')
        .update({ permission_level: permissionLevel })
        .eq('id', permissionId);

      if (error) throw error;
    } catch (err) {
      console.error('[sharingStore] updateUserPermission failed:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to update permission' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  createShareLink: async (itemType, itemId, permissionLevel, options) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error('Not authenticated');
      
      // Generate random token
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
      
      const { data, error } = await supabase
        .from('share_links')
        .insert({
          item_type: itemType,
          item_id: itemId,
          token,
          permission_level: permissionLevel,
          created_by: userData.user.id,
          expires_at: options?.expiresAt ? new Date(options.expiresAt).toISOString() : null,
          max_uses: options?.maxUses ?? null,
        })
        .select('token')
        .single();

      if (error) throw error;
      return data?.token ?? null;
    } catch (err) {
      console.error('[sharingStore] createShareLink failed:', err);
      const raw = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Failed to create share link';
      const friendly = raw.includes('relation') && raw.includes('does not exist')
        ? 'Database migration required — run migration 007 in the Supabase SQL Editor.'
        : raw.includes('violates row-level security')
          ? 'Permission denied — you can only create links for your own items.'
          : raw || 'Failed to create share link';
      set({ error: friendly });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  revokeShareLink: async (linkId) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('share_links')
        .update({ is_active: false })
        .eq('id', linkId);

      if (error) throw error;
    } catch (err) {
      console.error('[sharingStore] revokeShareLink failed:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to revoke link' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  getShareLink: async (itemType, itemId) => {
    try {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const link: ShareLink = {
        id: data.id,
        itemType: data.item_type as ItemType,
        itemId: data.item_id,
        token: data.token,
        permissionLevel: data.permission_level as 'editor' | 'viewer',
        createdAt: new Date(data.created_at).getTime(),
        expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
        isActive: data.is_active,
        accessCount: data.access_count,
        maxUses: data.max_uses ?? undefined,
      };

      return link;
    } catch {
      return null;
    }
  },

  getItemPermissions: async (itemType, itemId) => {
    const key = `${itemType}:${itemId}`;
    
    try {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('sharing_permissions')
        .select('*')
        .eq('item_type', itemType)
        .eq('item_id', itemId);

      if (error) throw error;

      const permissions: SharePermission[] = (data || []).map((p) => ({
        id: p.id,
        itemType: p.item_type as ItemType,
        itemId: p.item_id,
        sharedWithUserId: p.shared_with_user_id ?? undefined,
        sharedWithEmail: p.shared_with_email ?? undefined,
        permissionLevel: p.permission_level as PermissionLevel,
        sharedByUserId: p.shared_by_user_id,
        sharedAt: new Date(p.shared_at).getTime(),
        expiresAt: p.expires_at ? new Date(p.expires_at).getTime() : undefined,
      }));

      set((state) => {
        const newMap = new Map(state.itemPermissions);
        newMap.set(key, permissions);
        return { itemPermissions: newMap };
      });

      return permissions;
    } catch {
      return [];
    }
  },

  updateSharingMode: async (itemType, itemId, mode) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');
      const table = itemType === 'set' ? 'study_sets' : 'folders';
      // The folders table does NOT have a visibility column — only update it for sets
      const updates: Record<string, string> = { sharing_mode: mode };
      if (itemType === 'set') {
        updates.visibility = mode === 'public' ? 'public' : 'private';
      }
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        const msg = error.message || '';
        if (msg.includes('schema cache') || msg.includes('column')) {
          throw new Error('Database migration required — run migration 007 in the Supabase SQL Editor.');
        }
        if (msg.includes('0 rows') || msg.includes('no rows')) {
          throw new Error('Permission denied — could not update sharing mode.');
        }
        throw error;
      }
      if (!data) {
        throw new Error('Permission denied — could not update sharing mode.');
      }

      // Sync the new sharing mode into the local study store so the UI
      // reflects the change immediately without requiring a full reload.
      if (itemType === 'set') {
        const studyState = useStudyStore.getState();
        const idx = studyState.sets.findIndex((s) => s.id === itemId);
        if (idx !== -1) {
          const updated = [...studyState.sets];
          updated[idx] = { ...updated[idx], sharingMode: mode };
          useStudyStore.setState({ sets: updated });
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? 'Failed to update sharing mode';
      console.error('[sharingStore] updateSharingMode failed:', err);
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  getEffectivePermission: async (itemType, itemId) => {
    try {
      if (!supabase) return null;
      const { data, error } = await supabase.rpc('get_effective_permission', {
        p_item_type: itemType,
        p_item_id: itemId,
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;
      return data as PermissionLevel | null;
    } catch {
      return null;
    }
  },

  acceptShareLink: async (token) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error('Not authenticated');

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error('Not authenticated');

      // Validate the share link
      const { data, error } = await supabase.rpc('validate_share_link', {
        p_token: token,
      });

      if (error || !data || data.length === 0) {
        throw new Error('Invalid or expired share link');
      }

      const shareData = data[0];

      // Get share link details to find the creator (for shared_by_user_id)
      const { data: linkData } = await supabase
        .from('share_links')
        .select('created_by')
        .eq('token', token)
        .single();

      // Increment access count
      await supabase.rpc('increment_share_link_access', {
        p_token: token,
      });

      // Create a persistent sharing_permissions entry for the accepting user
      // Skip if user is the link creator (they already own the item)
      if (linkData?.created_by && linkData.created_by !== userData.user.id) {
        const { error: insertError } = await supabase.from('sharing_permissions').insert({
          item_type: shareData.item_type,
          item_id: shareData.item_id,
          shared_with_user_id: userData.user.id,
          shared_with_email: userData.user.email,
          permission_level: shareData.permission_level,
          shared_by_user_id: linkData.created_by,
        });
        // Unique constraint (item_type, item_id, shared_with_user_id) will
        // harmlessly reject duplicates if user clicks the link again
        if (insertError && !insertError.message?.includes('duplicate')) {
          console.warn('[sharingStore] Failed to create sharing_permissions entry:', insertError);
        }
      }

      return {
        itemType: shareData.item_type as ItemType,
        itemId: shareData.item_id,
      };
    } catch (err) {
      console.error('[sharingStore] acceptShareLink failed:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to accept share' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  loadPendingInvites: async () => {
    try {
      if (!supabase) {
        set({ pendingInvites: [] });
        return;
      }
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id || !user.data.user?.email) {
        set({ pendingInvites: [] });
        return;
      }

      // Claim any email-based invites that haven't been linked to this user yet
      // This resolves shared_with_email -> shared_with_user_id so RLS policies work
      try {
        await supabase.rpc('claim_email_invites');
      } catch {
        // RPC may not exist yet if migration 010 not applied; continue gracefully
      }

      // Query by both user_id and email to catch email-based invites
      const { data, error } = await supabase
        .from('sharing_permissions')
        .select(`
          id,
          item_type,
          item_id,
          permission_level,
          shared_by_user_id,
          shared_at,
          expires_at
        `)
        .or(`shared_with_user_id.eq.${user.data.user.id},shared_with_email.eq.${user.data.user.email}`);

      if (error) throw error;
      if (!data || data.length === 0) {
        set({ pendingInvites: [] });
        return;
      }

      // Batch-fetch actual item names
      const setIds = data.filter(d => d.item_type === 'set').map(d => d.item_id);
      const folderIds = data.filter(d => d.item_type === 'folder').map(d => d.item_id);

      const setNameMap = new Map<string, string>();
      if (setIds.length > 0) {
        const { data: sets } = await supabase
          .from('study_sets')
          .select('id, title')
          .in('id', setIds);
        sets?.forEach((s: { id: string; title: string }) => setNameMap.set(s.id, s.title));
      }

      const folderNameMap = new Map<string, string>();
      if (folderIds.length > 0) {
        const { data: folders } = await supabase
          .from('folders')
          .select('id, name')
          .in('id', folderIds);
        folders?.forEach((f: { id: string; name: string }) => folderNameMap.set(f.id, f.name));
      }

      // Fetch sharer emails via RPC
      const sharerIds = [...new Set(data.map(d => d.shared_by_user_id).filter(Boolean))];
      const emailMap = new Map<string, string>();
      if (sharerIds.length > 0) {
        try {
          const { data: emails } = await supabase.rpc('get_user_emails', { user_ids: sharerIds });
          if (emails) {
            (emails as { user_id: string; email: string }[]).forEach(e => emailMap.set(e.user_id, e.email));
          }
        } catch {
          // RPC may not exist yet if migration not applied; fall back gracefully
        }
      }

      const invites: PendingInvite[] = data.map((inv) => ({
        id: inv.id,
        itemType: inv.item_type as ItemType,
        itemId: inv.item_id,
        itemName: inv.item_type === 'set'
          ? (setNameMap.get(inv.item_id) || 'Untitled Set')
          : (folderNameMap.get(inv.item_id) || 'Untitled Folder'),
        sharedByEmail: emailMap.get(inv.shared_by_user_id) || 'Unknown',
        sharedByUserId: inv.shared_by_user_id,
        permissionLevel: inv.permission_level as PermissionLevel,
        sharedAt: new Date(inv.shared_at).getTime(),
        expiresAt: inv.expires_at ? new Date(inv.expires_at).getTime() : undefined,
      }));

      set({ pendingInvites: invites });
    } catch (err) {
      console.error('[sharingStore] loadPendingInvites failed:', err);
      set({ pendingInvites: [] });
    }
  },

  clearCache: (itemType, itemId) => {
    const key = `${itemType}:${itemId}`;
    set((state) => {
      const newPermissions = new Map(state.itemPermissions);
      const newLinks = new Map(state.itemShareLinks);
      newPermissions.delete(key);
      newLinks.delete(key);
      return { itemPermissions: newPermissions, itemShareLinks: newLinks };
    });
  },

  clearError: () => set({ error: null }),
}));
