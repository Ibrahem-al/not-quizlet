import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button, Input, PasswordStrength } from '../components/ui';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../hooks/useTranslation';
import {
  validatePassword,
  passwordsMatch,
} from '../lib/passwordValidation';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePassword } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Check if user has a session (they should if they clicked the reset link)
  useEffect(() => {
    // The session is automatically handled by Supabase when they click the magic link
    // The URL hash contains the access token which Supabase processes
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    // Validate password
    const validation = validatePassword(password);
    if (!validation.isValid) {
      const errors = validation.requirements
        .filter((req) => !req.met && req.message)
        .map((req) => req.message!);
      setValidationErrors(errors);
      return;
    }

    // Check password match
    if (!passwordsMatch(password, confirmPassword)) {
      setValidationErrors(['Passwords do not match']);
      return;
    }

    setIsLoading(true);

    const { error: updateError, validationErrors: updateValidationErrors, isReused } =
      await updatePassword(password, confirmPassword);

    if (updateError) {
      setError(updateError.message);
    } else if (updateValidationErrors.length > 0) {
      setValidationErrors(updateValidationErrors);
    } else if (isReused) {
      setValidationErrors([t('passwordReused')]);
    } else {
      setIsSuccess(true);
      // Redirect to sign in after 3 seconds
      setTimeout(() => {
        navigate('/signin');
      }, 3000);
    }

    setIsLoading(false);
  };

  const passwordInputType = showPassword ? 'text' : 'password';
  const confirmPasswordInputType = showConfirmPassword ? 'text' : 'password';

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border)] p-8 shadow-[var(--shadow-card)]">
            {!isSuccess ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6 text-[var(--color-primary)]" />
                  </div>
                  <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                    {t('resetPasswordTitle')}
                  </h1>
                  <p className="text-[var(--color-text-secondary)]">
                    Create a new password for your account.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New Password */}
                  <div className="relative">
                    <Input
                      type={passwordInputType}
                      placeholder={t('newPassword')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      icon={<Lock className="w-4 h-4" />}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength */}
                  {password && <PasswordStrength password={password} />}

                  {/* Confirm Password */}
                  <div className="relative">
                    <Input
                      type={confirmPasswordInputType}
                      placeholder={t('confirmNewPassword')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      icon={<Lock className="w-4 h-4" />}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Password Match Indicator */}
                  {confirmPassword && (
                    <div className="flex items-center gap-2 text-sm">
                      {passwordsMatch(password, confirmPassword) ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                          <span className="text-[var(--color-success)]">
                            {t('passwordsMatch')}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[var(--color-danger)]">
                            {t('passwordsDontMatch')}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1"
                    >
                      {validationErrors.map((err, i) => (
                        <p key={i} className="text-sm text-[var(--color-danger)]">
                          {err}
                        </p>
                      ))}
                    </motion.div>
                  )}

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm text-[var(--color-danger)] text-center"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !password || !confirmPassword}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      t('resetPasswordTitle')
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/signin"
                    className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </Link>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[var(--color-success)]" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
                  {t('passwordResetSuccess')}
                </h2>
                <p className="text-[var(--color-text-secondary)] mb-6">
                  Your password has been updated. You will be redirected to sign in shortly.
                </p>
                <Link to="/signin">
                  <Button variant="secondary" className="w-full">
                    Go to sign in
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
