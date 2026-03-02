import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

export function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);
  const showToast = useToastStore((s) => s.show);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password);
    setLoading(false);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', 'Account created. Sign in to sync your flashcards.');
    navigate('/signin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] border border-[var(--color-border)] p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-[var(--color-text)] mb-1">Create account</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Save your flashcards to the cloud and access them anywhere.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>
        <p className="mt-5 text-sm text-[var(--color-text-secondary)] text-center">
          Already have an account?{' '}
          <Link
            to="/signin"
            className="text-[var(--color-primary)] font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-3 text-center">
          <Link
            to="/"
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
          >
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
