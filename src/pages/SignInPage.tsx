import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useTranslation } from '../hooks/useTranslation';
import { AppLayout } from '../components/layout/AppLayout';

export function SignInPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);
  const showToast = useToastStore((s) => s.show);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', t('signInSuccess') || 'Signed in. Your sets are synced to the cloud.');
    navigate('/', { replace: true });
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
              {t('welcomeBack')}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t('signInToContinue')}
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('loading') || 'Signing in...'}
              </>
            ) : (
              t('signIn')
            )}
          </Button>
        </form>

          <p className="mt-5 text-sm text-[var(--color-text-secondary)] text-center">
            {t('dontHaveAccount')}{' '}
            <Link
              to="/signup"
              className="text-[var(--color-primary)] font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded"
            >
              {t('signUp')}
            </Link>
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
