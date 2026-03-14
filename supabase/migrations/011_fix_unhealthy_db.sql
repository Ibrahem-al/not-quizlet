-- Migration 011: Emergency rollback of migration 010
-- Run this FIRST to restore database health.
-- Keep it minimal so it executes even under timeout pressure.

-- Drop the problematic policies from migration 010
DROP POLICY IF EXISTS "Users can view sets shared with their email" ON public.study_sets;
DROP POLICY IF EXISTS "Users can view permissions for accessible items" ON public.sharing_permissions;
DROP FUNCTION IF EXISTS public.claim_email_invites();
