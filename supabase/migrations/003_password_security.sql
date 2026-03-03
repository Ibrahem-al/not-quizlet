-- Migration: Password Security Enhancements
-- Features: Password history tracking (last 5), reuse prevention, rate limiting

-- 1. Create password history table
-- Stores last 5 password hashes for each user to prevent reuse
CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on password history
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Only users can view their own password history (though this is mainly used by functions)
CREATE POLICY "Users can only view own password history"
  ON public.password_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can insert (via trigger or functions)
CREATE POLICY "System can insert password history"
  ON public.password_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Create index for faster lookups
CREATE INDEX idx_password_history_user_id ON public.password_history(user_id);
CREATE INDEX idx_password_history_created_at ON public.password_history(created_at DESC);

-- 3. Function to add password to history
-- Maintains only the last 5 passwords per user
CREATE OR REPLACE FUNCTION public.add_password_to_history(p_user_id uuid, p_password_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the new password hash
  INSERT INTO public.password_history (user_id, password_hash)
  VALUES (p_user_id, p_password_hash);

  -- Delete old entries keeping only the last 5
  DELETE FROM public.password_history
  WHERE id IN (
    SELECT id FROM public.password_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    OFFSET 5
  );
END;
$$;

-- 4. Function to check if password is in history
-- Returns true if password was used in the last 5 passwords
CREATE OR REPLACE FUNCTION public.check_password_reuse(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_reused boolean := false;
  v_hash text;
BEGIN
  -- Get the current user's encrypted_password format from auth.users
  -- We store a bcrypt hash of the password attempt and compare with stored hashes
  -- Note: In production, you'd use crypt() extension, but for now we do a simple check

  -- Check if any of the last 5 password hashes match
  -- This is a simplified check - in production you'd use proper bcrypt comparison
  SELECT EXISTS (
    SELECT 1 FROM public.password_history
    WHERE user_id = p_user_id
    AND password_hash = crypt(p_password, password_hash)
    ORDER BY created_at DESC
    LIMIT 5
  ) INTO v_is_reused;

  RETURN v_is_reused;
END;
$$;

-- 5. Create a secure function to check password strength
-- Returns a JSON object with validation results
CREATE OR REPLACE FUNCTION public.validate_password_strength(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_is_valid boolean := true;
  v_score integer := 0;
  v_requirements jsonb := '[]'::jsonb;
BEGIN
  -- Check minimum length (12 characters)
  IF LENGTH(p_password) >= 12 THEN
    v_score := v_score + 1;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'min_length', 'met', true);
  ELSE
    v_is_valid := false;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'min_length', 'met', false, 'message', 'Password must be at least 12 characters');
  END IF;

  -- Check for uppercase letter
  IF p_password ~ '[A-Z]' THEN
    v_score := v_score + 1;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'uppercase', 'met', true);
  ELSE
    v_is_valid := false;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'uppercase', 'met', false, 'message', 'Password needs at least 1 uppercase letter');
  END IF;

  -- Check for lowercase letter
  IF p_password ~ '[a-z]' THEN
    v_score := v_score + 1;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'lowercase', 'met', true);
  ELSE
    v_is_valid := false;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'lowercase', 'met', false, 'message', 'Password needs at least 1 lowercase letter');
  END IF;

  -- Check for number
  IF p_password ~ '[0-9]' THEN
    v_score := v_score + 1;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'number', 'met', true);
  ELSE
    v_is_valid := false;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'number', 'met', false, 'message', 'Password needs at least 1 number');
  END IF;

  -- Check for special character
  IF p_password ~ '[!@#$%^&*()_+\-=\[\]{};":''\\|,.<>\/?]' THEN
    v_score := v_score + 1;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'special', 'met', true);
  ELSE
    v_is_valid := false;
    v_requirements := v_requirements || jsonb_build_object('requirement', 'special', 'met', false, 'message', 'Password needs at least 1 special character');
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'is_valid', v_is_valid,
    'score', v_score,
    'strength', CASE 
      WHEN v_score >= 5 THEN 'strong'
      WHEN v_score >= 3 THEN 'medium'
      ELSE 'weak'
    END,
    'requirements', v_requirements
  );

  RETURN v_result;
END;
$$;

-- 6. Table for tracking failed login attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  attempted_at timestamptz DEFAULT now() NOT NULL,
  ip_address inet
);

CREATE INDEX idx_failed_login_email ON public.failed_login_attempts(email);
CREATE INDEX idx_failed_login_attempted_at ON public.failed_login_attempts(attempted_at);

-- 7. Function to check if account is locked (5 failed attempts in 30 minutes)
CREATE OR REPLACE FUNCTION public.is_account_locked(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_failed_count integer;
BEGIN
  SELECT COUNT(*) INTO v_failed_count
  FROM public.failed_login_attempts
  WHERE email = p_email
  AND attempted_at > (now() - interval '30 minutes');

  RETURN v_failed_count >= 5;
END;
$$;

-- 8. Function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email text, p_ip_address inet DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.failed_login_attempts (email, ip_address)
  VALUES (p_email, p_ip_address);

  -- Clean up old records (older than 1 hour)
  DELETE FROM public.failed_login_attempts
  WHERE attempted_at < (now() - interval '1 hour');
END;
$$;

-- 9. Function to clear failed login attempts (on successful login)
CREATE OR REPLACE FUNCTION public.clear_failed_logins(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.failed_login_attempts
  WHERE email = p_email;
END;
$$;

-- 10. Table for password reset rate limiting
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  requested_at timestamptz DEFAULT now() NOT NULL,
  ip_address inet
);

CREATE INDEX idx_password_reset_email ON public.password_reset_requests(email);
CREATE INDEX idx_password_reset_requested_at ON public.password_reset_requests(requested_at);

-- 11. Function to check password reset rate limit (5 per hour per email)
CREATE OR REPLACE FUNCTION public.can_request_password_reset(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_count integer;
BEGIN
  SELECT COUNT(*) INTO v_request_count
  FROM public.password_reset_requests
  WHERE email = p_email
  AND requested_at > (now() - interval '1 hour');

  -- Allow if less than 5 requests in the last hour
  RETURN v_request_count < 5;
END;
$$;

-- 12. Function to record password reset request
CREATE OR REPLACE FUNCTION public.record_password_reset_request(p_email text, p_ip_address inet DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.password_reset_requests (email, ip_address)
  VALUES (p_email, p_ip_address);

  -- Clean up old records (older than 24 hours)
  DELETE FROM public.password_reset_requests
  WHERE requested_at < (now() - interval '24 hours');
END;
$$;

-- Enable pgcrypto extension for crypt() function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON TABLE public.password_history IS 'Stores last 5 password hashes per user to prevent reuse';
COMMENT ON TABLE public.failed_login_attempts IS 'Tracks failed login attempts for account lockout protection';
COMMENT ON TABLE public.password_reset_requests IS 'Tracks password reset requests for rate limiting';
