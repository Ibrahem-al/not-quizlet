import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff, User } from 'lucide-react';
import { Button, Input, PasswordStrength } from '../components/ui';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../hooks/useTranslation';
import {
  validatePassword,
  passwordsMatch,
} from '../lib/passwordValidation';

export function AccountSettingsPage() {
  const { t } = useTranslation();
  const { user, updatePassword, verifyCurrentPassword } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);
    setCurrentPasswordError(null);

    // Verify current password first
    setIsVerifying(true);
    const isCurrentPasswordValid = await verifyCurrentPassword(currentPassword);
    setIsVerifying(false);

    if (!isCurrentPasswordValid) {
      setCurrentPasswordError('Current password is incorrect');
      return;
    }

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      const errors = validation.requirements
        .filter((req) => !req.met && req.message)
        .map((req) => req.message!);
      setValidationErrors(errors);
      return;
    }

    // Check password match
    if (!passwordsMatch(newPassword, confirmPassword)) {
      setValidationErrors(['Passwords do not match']);
      return;
    }

    setIsLoading(true);

    const { error: updateError, validationErrors: updateValidationErrors, isReused } =
      await updatePassword(newPassword, confirmPassword);

    if (updateError) {
      setError(updateError.message);
    } else if (updateValidationErrors.length > 0) {
      setValidationErrors(updateValidationErrors);
    } else if (isReused) {
      setValidationErrors([t('passwordReused')]);
    } else {
      setIsSuccess(true);
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }

    setIsLoading(false);
  };

  return (
    <AppLayout breadcrumbs={[{ label: t('accountSettings') }]}>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-muted)] flex items-center justify-center">
                <User className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                {t('accountSettings')}
              </h1>
            </div>
            <p className="text-[var(--color-text-secondary)]">
              Manage your account settings and security preferences.
            </p>
          </div>

          {/* Change Password Section */}
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                {t('changePassword')}
              </h2>
            </div>

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-[var(--radius-md)] p-4 text-center"
              >
                <CheckCircle className="w-8 h-8 text-[var(--color-success)] mx-auto mb-2" />
                <p className="text-[var(--color-success)] font-medium">
                  {t('passwordChanged')}
                </p>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="mt-3 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  Change password again
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Current Password */}
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder={t('currentPassword')}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    icon={<Lock className="w-4 h-4" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {currentPasswordError && (
                  <p className="text-sm text-[var(--color-danger)]">
                    {currentPasswordError}
                  </p>
                )}

                {/* New Password */}
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder={t('newPassword')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    icon={<Lock className="w-4 h-4" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength */}
                {newPassword && (
                  <PasswordStrength password={newPassword} />
                )}

                {/* Confirm New Password */}
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
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

                {/* Password Match */}
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-sm">
                    {passwordsMatch(newPassword, confirmPassword) ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                        <span className="text-[var(--color-success)]">
                          {t('passwordsMatch')}
                        </span>
                      </>
                    ) : (
                      <span className="text-[var(--color-danger)]">
                        {t('passwordsDontMatch')}
                      </span>
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
                    className="text-sm text-[var(--color-danger)]"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading || isVerifying}
                  >
                    {isLoading || isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isVerifying ? 'Verifying...' : 'Updating...'}
                      </>
                    ) : (
                      t('changePassword')
                    )}
                  </Button>
                  <Link
                    to="/"
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            )}
          </div>

          {/* Back Link */}
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
