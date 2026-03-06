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
      const { error } = await supabase.from('sharing_permissions').insert({
        item_type: itemType,
        item_id: itemId,
        shared_with_email: email,
        permission_level: permissionLevel,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      if (error) throw error;

      // Refresh permissions
      await get().getItemPermissions(itemType, itemId);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to share' });
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
    } catch (err) {
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
      console.error('Failed to create share link:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to create share link' });
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
      // Update both sharing_mode (new) and visibility (legacy) for backwards compatibility
      const { error } = await supabase
        .from(table)
        .update({ 
          sharing_mode: mode,
          visibility: mode === 'public' ? 'public' : 'private'
        })
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update sharing mode' });
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
      // Validate the share link
      const { data, error } = await supabase.rpc('validate_share_link', {
        p_token: token,
      });

      if (error || !data || data.length === 0) {
        throw new Error('Invalid or expired share link');
      }

      const shareData = data[0];

      // Increment access count
      await supabase.rpc('increment_share_link_access', {
        p_token: token,
      });

      return {
        itemType: shareData.item_type as ItemType,
        itemId: shareData.item_id,
      };
    } catch (err) {
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
      if (!user.data.user?.id) {
        set({ pendingInvites: [] });
        return;
      }
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
        .eq('shared_with_user_id', user.data.user.id);

      if (error) throw error;

      // TODO: Join with item names and shared_by email
      const invites: PendingInvite[] = (data || []).map((inv) => ({
        id: inv.id,
        itemType: inv.item_type as ItemType,
        itemId: inv.item_id,
        itemName: 'Shared Item', // Would need join
        sharedByEmail: 'Unknown', // Would need join
        sharedByUserId: inv.shared_by_user_id,
        permissionLevel: inv.permission_level as PermissionLevel,
        sharedAt: new Date(inv.shared_at).getTime(),
        expiresAt: inv.expires_at ? new Date(inv.expires_at).getTime() : undefined,
      }));

      set({ pendingInvites: invites });
    } catch {
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
