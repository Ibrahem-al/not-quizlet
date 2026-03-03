-- Migration: Granular Sharing System with Folders
-- Implements Google Docs-style sharing with permissions, links, and folder organization

-- ============================================
-- 1. ENUM TYPES
-- ============================================

create type sharing_mode as enum ('private', 'restricted', 'link', 'public');
create type permission_level as enum ('owner', 'editor', 'viewer');
create type item_type as enum ('set', 'folder');

-- ============================================
-- 2. FOLDERS TABLE
-- ============================================

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  parent_folder_id uuid null references public.folders(id) on delete cascade,
  color text default 'blue',
  sharing_mode sharing_mode default 'private',
  created_at bigint not null default extract(epoch from now())*1000,
  updated_at bigint not null default extract(epoch from now())*1000
);

-- Indexes for folders
create index idx_folders_user_id on public.folders(user_id);
create index idx_folders_parent_id on public.folders(parent_folder_id);
create index idx_folders_sharing_mode on public.folders(sharing_mode);

-- ============================================
-- 3. FOLDER ITEMS TABLE (Sets in folders)
-- ============================================

create table if not exists public.folder_items (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  item_type item_type not null default 'set',
  item_id uuid not null,
  added_at bigint not null default extract(epoch from now())*1000,
  added_by uuid not null references auth.users(id),
  unique(folder_id, item_id)
);

create index idx_folder_items_folder_id on public.folder_items(folder_id);
create index idx_folder_items_item_id on public.folder_items(item_id);

-- ============================================
-- 4. SHARING PERMISSIONS TABLE
-- ============================================

create table if not exists public.sharing_permissions (
  id uuid primary key default gen_random_uuid(),
  item_type item_type not null,
  item_id uuid not null,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  shared_with_email text, -- for pending invites
  permission_level permission_level not null,
  shared_by_user_id uuid not null references auth.users(id),
  shared_at timestamptz default now(),
  expires_at timestamptz null,
  unique(item_type, item_id, shared_with_user_id)
);

create index idx_sharing_permissions_item on public.sharing_permissions(item_type, item_id);
create index idx_sharing_permissions_user on public.sharing_permissions(shared_with_user_id);
create index idx_sharing_permissions_shared_by on public.sharing_permissions(shared_by_user_id);

-- ============================================
-- 5. SHARE LINKS TABLE
-- ============================================

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  item_type item_type not null,
  item_id uuid not null,
  token text unique not null,
  permission_level permission_level not null check (permission_level in ('editor', 'viewer')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz null,
  access_count int default 0,
  max_uses int null, -- null = unlimited
  is_active boolean default true
);

create index idx_share_links_token on public.share_links(token);
create index idx_share_links_item on public.share_links(item_type, item_id);
create index idx_share_links_created_by on public.share_links(created_by);

-- ============================================
-- 6. UPDATE STUDY_SETS TABLE
-- ============================================

-- Add sharing_mode column if not exists
alter table public.study_sets 
  add column if not exists sharing_mode sharing_mode default 'private',
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index idx_study_sets_sharing_mode on public.study_sets(sharing_mode);
create index idx_study_sets_folder_id on public.study_sets(folder_id);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to get effective permission for a user on an item
-- Returns 'owner', 'editor', 'viewer', or null if no access

create or replace function public.get_effective_permission(
  p_item_type item_type,
  p_item_id uuid,
  p_user_id uuid
) returns permission_level as $$
declare
  v_owner_id uuid;
  v_direct_permission permission_level;
  v_folder_permission permission_level;
  v_item_folder_id uuid;
  v_folder_sharing_mode sharing_mode;
begin
  -- Check if user is the owner
  if p_item_type = 'set' then
    select user_id into v_owner_id from public.study_sets where id = p_item_id;
  elsif p_item_type = 'folder' then
    select user_id into v_owner_id from public.folders where id = p_item_id;
  end if;
  
  if v_owner_id = p_user_id then
    return 'owner';
  end if;
  
  -- Check direct sharing permission
  select permission_level into v_direct_permission
  from public.sharing_permissions
  where item_type = p_item_type 
    and item_id = p_item_id 
    and shared_with_user_id = p_user_id
    and (expires_at is null or expires_at > now());
    
  if v_direct_permission is not null then
    return v_direct_permission;
  end if;
  
  -- For sets, check folder permissions
  if p_item_type = 'set' then
    select folder_id into v_item_folder_id from public.study_sets where id = p_item_id;
    
    if v_item_folder_id is not null then
      -- Check if user has permission on the folder
      select permission_level into v_folder_permission
      from public.sharing_permissions
      where item_type = 'folder' 
        and item_id = v_item_folder_id 
        and shared_with_user_id = p_user_id
        and (expires_at is null or expires_at > now());
        
      if v_folder_permission is not null then
        return v_folder_permission;
      end if;
      
      -- Check if folder is public/link-shared
      select sharing_mode into v_folder_sharing_mode 
      from public.folders where id = v_item_folder_id;
      
      if v_folder_sharing_mode = 'public' then
        return 'viewer';
      end if;
    end if;
  end if;
  
  return null;
end;
$$ language plpgsql security definer;

-- Function to check if a share link is valid and return permission

create or replace function public.validate_share_link(
  p_token text
) returns table (
  item_type item_type,
  item_id uuid,
  permission_level permission_level
) as $$
begin
  return query
  select 
    sl.item_type,
    sl.item_id,
    sl.permission_level
  from public.share_links sl
  where sl.token = p_token
    and sl.is_active = true
    and (sl.expires_at is null or sl.expires_at > now())
    and (sl.max_uses is null or sl.access_count < sl.max_uses);
end;
$$ language plpgsql security definer;

-- Function to increment share link access count

create or replace function public.increment_share_link_access(
  p_token text
) returns void as $$
begin
  update public.share_links
  set access_count = access_count + 1
  where token = p_token;
end;
$$ language plpgsql security definer;

-- Function to get folder contents recursively

create or replace function public.get_folder_recursive_contents(
  p_folder_id uuid
) returns table (
  item_id uuid,
  item_type item_type,
  depth int
) as $$
begin
  -- Return sets in this folder
  return query
  select 
    fi.item_id,
    fi.item_type,
    1 as depth
  from public.folder_items fi
  where fi.folder_id = p_folder_id;
end;
$$ language plpgsql security definer;

-- Function to cascade folder permissions to contents

create or replace function public.cascade_folder_permissions(
  p_folder_id uuid,
  p_sharing_mode sharing_mode
) returns void as $$
begin
  -- Update all sets in folder to match folder sharing mode
  -- unless they have explicit individual sharing set
  update public.study_sets ss
  set sharing_mode = p_sharing_mode
  where ss.folder_id = p_folder_id
    and not exists (
      select 1 from public.sharing_permissions sp
      where sp.item_type = 'set' and sp.item_id = ss.id
    );
end;
$$ language plpgsql security definer;

-- ============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.folders enable row level security;
alter table public.folder_items enable row level security;
alter table public.sharing_permissions enable row level security;
alter table public.share_links enable row level security;

-- Folders policies

create policy "Users can view own folders"
  on public.folders for select
  using (user_id = auth.uid());

create policy "Users can view shared folders"
  on public.folders for select
  using (
    sharing_mode in ('public', 'link') 
    or exists (
      select 1 from public.sharing_permissions sp
      where sp.item_type = 'folder' 
        and sp.item_id = folders.id
        and sp.shared_with_user_id = auth.uid()
    )
  );

create policy "Users can create folders"
  on public.folders for insert
  with check (user_id = auth.uid());

create policy "Users can update own folders"
  on public.folders for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own folders"
  on public.folders for delete
  using (user_id = auth.uid());

-- Folder items policies

create policy "Users can view folder items"
  on public.folder_items for select
  using (
    exists (
      select 1 from public.folders f
      where f.id = folder_items.folder_id
        and (f.user_id = auth.uid() 
             or f.sharing_mode in ('public', 'link')
             or exists (
               select 1 from public.sharing_permissions sp
               where sp.item_type = 'folder' 
                 and sp.item_id = f.id
                 and sp.shared_with_user_id = auth.uid()
             ))
    )
  );

create policy "Users can add items to own folders"
  on public.folder_items for insert
  with check (
    added_by = auth.uid()
    and exists (
      select 1 from public.folders f
      where f.id = folder_items.folder_id
        and f.user_id = auth.uid()
    )
  );

create policy "Users can remove items from own folders"
  on public.folder_items for delete
  using (
    exists (
      select 1 from public.folders f
      where f.id = folder_items.folder_id
        and f.user_id = auth.uid()
    )
  );

-- Sharing permissions policies

create policy "Users can view permissions they created"
  on public.sharing_permissions for select
  using (shared_by_user_id = auth.uid());

create policy "Users can view permissions shared with them"
  on public.sharing_permissions for select
  using (shared_with_user_id = auth.uid());

create policy "Users can create sharing permissions for their items"
  on public.sharing_permissions for insert
  with check (
    shared_by_user_id = auth.uid()
    and (
      (item_type = 'set' and exists (
        select 1 from public.study_sets s where s.id = item_id and s.user_id = auth.uid()
      ))
      or (item_type = 'folder' and exists (
        select 1 from public.folders f where f.id = item_id and f.user_id = auth.uid()
      ))
    )
  );

create policy "Users can delete their own sharing permissions"
  on public.sharing_permissions for delete
  using (shared_by_user_id = auth.uid());

-- Share links policies

create policy "Users can view their share links"
  on public.share_links for select
  using (created_by = auth.uid());

create policy "Anyone can view active share links"
  on public.share_links for select
  using (
    is_active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or access_count < max_uses)
  );

create policy "Users can create share links for their items"
  on public.share_links for insert
  with check (
    created_by = auth.uid()
    and (
      (item_type = 'set' and exists (
        select 1 from public.study_sets s where s.id = item_id and s.user_id = auth.uid()
      ))
      or (item_type = 'folder' and exists (
        select 1 from public.folders f where f.id = item_id and f.user_id = auth.uid()
      ))
    )
  );

create policy "Users can update their share links"
  on public.share_links for update
  using (created_by = auth.uid());

create policy "Users can delete their share links"
  on public.share_links for delete
  using (created_by = auth.uid());

-- Update study_sets policies

create policy "Users can view sets shared with them"
  on public.study_sets for select
  using (
    sharing_mode in ('public', 'link')
    or exists (
      select 1 from public.sharing_permissions sp
      where sp.item_type = 'set' 
        and sp.item_id = study_sets.id
        and sp.shared_with_user_id = auth.uid()
    )
    or exists (
      select 1 from public.folders f
      where f.id = study_sets.folder_id
        and (f.sharing_mode in ('public', 'link')
             or exists (
               select 1 from public.sharing_permissions sp
               where sp.item_type = 'folder' 
                 and sp.item_id = f.id
                 and sp.shared_with_user_id = auth.uid()
             ))
    )
  );

-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Auto-update updated_at on folders

create or replace function public.update_folder_timestamp()
returns trigger as $$
begin
  new.updated_at = extract(epoch from now())*1000;
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_folder_timestamp
  before update on public.folders
  for each row
  execute function public.update_folder_timestamp();

-- Auto-cascade folder sharing mode to sets

create or replace function public.handle_folder_sharing_change()
returns trigger as $$
begin
  if old.sharing_mode != new.sharing_mode then
    perform public.cascade_folder_permissions(new.id, new.sharing_mode);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_folder_sharing_change
  after update on public.folders
  for each row
  when (old.sharing_mode is distinct from new.sharing_mode)
  execute function public.handle_folder_sharing_change();

-- ============================================
-- 10. COMMENTS
-- ============================================

comment on table public.folders is 'Organizational folders for study sets';
comment on table public.folder_items is 'Junction table linking sets to folders';
comment on table public.sharing_permissions is 'Direct user-to-user sharing permissions';
comment on table public.share_links is 'Shareable links for unlisted access';
comment on function public.get_effective_permission is 'Returns the effective permission level for a user on an item, considering ownership, direct sharing, and folder inheritance';

-- ============================================
-- 11. MIGRATE EXISTING DATA
-- ============================================

-- Convert existing visibility to sharing_mode
update public.study_sets 
set sharing_mode = case 
  when visibility = 'public' then 'public'::sharing_mode
  else 'private'::sharing_mode
end;

-- Note: Old visibility column can be dropped after verification
-- alter table public.study_sets drop column if exists visibility;
