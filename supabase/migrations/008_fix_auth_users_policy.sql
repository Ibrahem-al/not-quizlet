-- Migration 008: Fix "permission denied for table users"
--
-- The RLS policy "Users can view permissions shared with their email" used
-- SELECT email FROM auth.users WHERE id = auth.uid(), which fails because the
-- authenticated role does not have SELECT permission on auth.users.
--
-- Fix: use auth.jwt() ->> 'email' instead, which reads from the JWT token
-- and requires no table access.

DROP POLICY IF EXISTS "Users can view permissions shared with their email" ON public.sharing_permissions;
CREATE POLICY "Users can view permissions shared with their email"
  ON public.sharing_permissions FOR SELECT
  USING (
    shared_with_email = (auth.jwt() ->> 'email')
  );
