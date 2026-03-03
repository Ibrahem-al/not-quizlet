import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../hooks/useTranslation';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error: resetError, rateLimited } = await resetPassword(email);

    if (rateLimited) {
      setError('Too many reset attempts. Please try again later.');
    } else if (resetError) {
      setError(resetError.message);
    } else {
      setIsSent(true);
    }

    setIsLoading(false);
  };

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border)] p-8 shadow-[var(--shadow-card)]">
            {!isSent ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-[var(--color-primary)]" />
                  </div>
                  <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                    {t('forgotPasswordTitle')}
                  </h1>
                  <p className="text-[var(--color-text-secondary)]">
                    Enter your email and we will send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    icon={<Mail className="w-4 h-4" />}
                  />

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
                    disabled={isLoading || !email}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send reset link'
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
                  {t('resetLinkSent')}
                </h2>
                <p className="text-[var(--color-text-secondary)] mb-6">
                  {t('checkEmail')}
                </p>
                <Link to="/signin">
                  <Button variant="secondary" className="w-full">
                    Back to sign in
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
