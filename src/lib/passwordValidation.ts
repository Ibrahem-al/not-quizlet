import { supabase, isSupabaseConfigured } from './supabase';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  strength: 'weak' | 'medium' | 'strong';
  requirements: PasswordRequirement[];
}

export interface PasswordRequirement {
  requirement: string;
  met: boolean;
  message?: string;
}

/**
 * Validates a password against all security requirements
 * - Minimum 12 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character
 */
export function validatePassword(password: string): PasswordValidationResult {
  let score = 0;
  const requirements: PasswordRequirement[] = [];

  // Check minimum length (12 characters)
  const hasMinLength = password.length >= 12;
  requirements.push({
    requirement: 'min_length',
    met: hasMinLength,
    message: hasMinLength ? undefined : 'Password must be at least 12 characters',
  });
  if (hasMinLength) score += 1;

  // Check for uppercase letter
  const hasUppercase = /[A-Z]/.test(password);
  requirements.push({
    requirement: 'uppercase',
    met: hasUppercase,
    message: hasUppercase ? undefined : 'Password needs at least 1 uppercase letter',
  });
  if (hasUppercase) score += 1;

  // Check for lowercase letter
  const hasLowercase = /[a-z]/.test(password);
  requirements.push({
    requirement: 'lowercase',
    met: hasLowercase,
    message: hasLowercase ? undefined : 'Password needs at least 1 lowercase letter',
  });
  if (hasLowercase) score += 1;

  // Check for number
  const hasNumber = /[0-9]/.test(password);
  requirements.push({
    requirement: 'number',
    met: hasNumber,
    message: hasNumber ? undefined : 'Password needs at least 1 number',
  });
  if (hasNumber) score += 1;

  // Check for special character
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  requirements.push({
    requirement: 'special',
    met: hasSpecial,
    message: hasSpecial ? undefined : 'Password needs at least 1 special character',
  });
  if (hasSpecial) score += 1;

  // Determine strength based on score
  const strength: 'weak' | 'medium' | 'strong' =
    score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak';

  // Password is valid only if all requirements are met
  const isValid = requirements.every((req) => req.met);

  return {
    isValid,
    score,
    strength,
    requirements,
  };
}

/**
 * Checks if a password has been used before (against the last 5 passwords)
 * Returns true if password is being reused
 */
export async function checkPasswordReuse(userId: string, password: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    // If Supabase isn't configured, skip the check
    return false;
  }

  try {
    const { data, error } = await supabase.rpc('check_password_reuse', {
      p_user_id: userId,
      p_password: password,
    });

    if (error) {
      console.error('Error checking password reuse:', error);
      return false;
    }

    return data || false;
  } catch (err) {
    console.error('Failed to check password reuse:', err);
    return false;
  }
}

/**
 * Validates password strength using Supabase RPC function
 * Returns detailed validation results from the database
 */
export async function validatePasswordWithSupabase(password: string): Promise<PasswordValidationResult> {
  if (!isSupabaseConfigured() || !supabase) {
    // Fall back to local validation
    return validatePassword(password);
  }

  try {
    const { data, error } = await supabase.rpc('validate_password_strength', {
      p_password: password,
    });

    if (error) {
      console.error('Error validating password with Supabase:', error);
      return validatePassword(password);
    }

    return {
      isValid: data.is_valid,
      score: data.score,
      strength: data.strength,
      requirements: data.requirements,
    };
  } catch (err) {
    console.error('Failed to validate password with Supabase:', err);
    return validatePassword(password);
  }
}

/**
 * Gets the list of password requirements for UI display
 */
export function getPasswordRequirements(): { key: string; label: string; regex: RegExp }[] {
  return [
    { key: 'min_length', label: 'At least 12 characters', regex: /^.{12,}$/ },
    { key: 'uppercase', label: 'At least 1 uppercase letter (A-Z)', regex: /[A-Z]/ },
    { key: 'lowercase', label: 'At least 1 lowercase letter (a-z)', regex: /[a-z]/ },
    { key: 'number', label: 'At least 1 number (0-9)', regex: /[0-9]/ },
    { key: 'special', label: 'At least 1 special character (!@#$%^&*)', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
  ];
}

/**
 * Calculates password strength percentage (0-100)
 */
export function calculateStrengthPercentage(password: string): number {
  if (!password) return 0;

  const result = validatePassword(password);
  return (result.score / 5) * 100;
}

/**
 * Gets a color for the strength indicator
 */
export function getStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'strong':
      return 'var(--color-success)';
    case 'medium':
      return 'var(--color-warning)';
    case 'weak':
    default:
      return 'var(--color-danger)';
  }
}

/**
 * Gets a label for the strength indicator
 */
export function getStrengthLabel(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'strong':
      return 'Strong';
    case 'medium':
      return 'Medium';
    case 'weak':
    default:
      return 'Weak';
  }
}

/**
 * Checks if passwords match
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && password.length > 0;
}

/**
 * Complete password validation for sign up / password change
 * Returns array of error messages if invalid
 */
export function getPasswordErrors(password: string, confirmPassword?: string): string[] {
  const errors: string[] = [];
  const validation = validatePassword(password);

  if (!validation.isValid) {
    validation.requirements
      .filter((req) => !req.met && req.message)
      .forEach((req) => {
        if (req.message) errors.push(req.message);
      });
  }

  if (confirmPassword !== undefined && !passwordsMatch(password, confirmPassword)) {
    errors.push('Passwords do not match');
  }

  return errors;
}
