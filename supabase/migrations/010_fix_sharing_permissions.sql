-- Migration 010: Fix sharing permission gaps
--
-- Issues fixed:
-- 1. Email-based invites (shareWithUser) don't grant read access to study_sets
--    because the RLS policy only checks shared_with_user_id, not email.
-- 2. loadPendingInvites can't fetch set titles for email-only invites.
-- 3. Need a function to resolve email invites to user_id on login.

-- ============================================================
-- 1. RLS: Allow reading study_sets when shared via email
-- ============================================================

-- Users should be able to read a set if they have a sharing_permissions
-- entry matching their email (from JWT), even before shared_with_user_id is set.
DROP POLICY IF EXISTS "Users can view sets shared with their email" ON public.study_sets;
CREATE POLICY "Users can view sets shared with their email"
  ON public.study_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sharing_permissions sp
      WHERE sp.item_type = 'set'
        AND sp.item_id = study_sets.id
        AND sp.shared_with_email = (auth.jwt() ->> 'email')
        AND (sp.expires_at IS NULL OR sp.expires_at > now())
    )
  );

-- ============================================================
-- 2. RPC: Claim email-based invites (resolve to user_id)
-- ============================================================
-- When a user views the "Shared with me" page, this function updates
-- any sharing_permissions rows that match their email but lack a user_id.

CREATE OR REPLACE FUNCTION public.claim_email_invites()
RETURNS integer AS $$
DECLARE
  claimed_count integer;
BEGIN
  UPDATE public.sharing_permissions
  SET shared_with_user_id = auth.uid()
  WHERE shared_with_email = (auth.jwt() ->> 'email')
    AND shared_with_user_id IS NULL;

  GET DIAGNOSTICS claimed_count = ROW_COUNT;
  RETURN claimed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. RLS: Allow users to update their own email-based invites
-- ============================================================
-- The claim_email_invites function runs as SECURITY DEFINER so it
-- bypasses RLS. But we also need a policy so the sharing_permissions
-- INSERT policy for "accept share links" works with email matching.

-- Allow users to view sharing_permissions for items they can already see
-- (prevents the loadPendingInvites set title lookup from failing)
DROP POLICY IF EXISTS "Users can view permissions for accessible items" ON public.sharing_permissions;
CREATE POLICY "Users can view permissions for accessible items"
  ON public.sharing_permissions FOR SELECT
  USING (
    shared_with_user_id = auth.uid()
    OR shared_with_email = (auth.jwt() ->> 'email')
    OR shared_by_user_id = auth.uid()
  );
