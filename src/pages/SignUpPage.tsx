import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button, Input, PasswordStrength } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useTranslation } from '../hooks/useTranslation';
import { passwordsMatch } from '../lib/passwordValidation';
import { AppLayout } from '../components/layout/AppLayout';

export function SignUpPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const signUp = useAuthStore((s) => s.signUp);
  const showToast = useToastStore((s) => s.show);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    setLoading(true);
    const { error, validationErrors: errors } = await signUp(
      email.trim(),
      password,
      confirmPassword
    );
    setLoading(false);

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (error) {
      showToast('error', error.message);
      return;
    }

    showToast('success', t('signUpSuccess') || 'Account created. Sign in to sync your flashcards.');
    navigate('/signin', { replace: true });
  };

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center px-4 py-8 min-h-[80vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] border border-[var(--color-border)] p-6 sm:p-8"
        >
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-[var(--color-text)] mb-1">
              {t('createAccount')}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t('startYourJourney')}
            </p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <Input
            type="email"
            label={t('email')}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            icon={<Mail className="w-4 h-4" />}
          />

          {/* Password */}
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label={t('password')}
              placeholder={t('passwordMinLength')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              icon={<Lock className="w-4 h-4" />}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
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
              type={showConfirmPassword ? 'text' : 'password'}
              label={t('confirmPassword')}
              placeholder={t('confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              icon={<Lock className="w-4 h-4" />}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-[34px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
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
                <span className="text-[var(--color-success)]">
                  {t('passwordsMatch')}
                </span>
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('loading') || 'Creating account...'}
              </>
            ) : (
              t('signUp')
            )}
          </Button>
        </form>

          <p className="mt-5 text-sm text-[var(--color-text-secondary)] text-center">
            {t('alreadyHaveAccount')}{' '}
            <Link
              to="/signin"
              className="text-[var(--color-primary)] font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded"
            >
              {t('signIn')}
            </Link>
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
