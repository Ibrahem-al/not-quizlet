import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../ui';
import { useAuthStore } from '../../stores/authStore';
import { isSupabaseConfigured } from '../../lib/cloudSync';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  headerRight?: React.ReactNode;
}

function AuthHeader() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();
  if (!isSupabaseConfigured()) return null;
  return (
    <div className="flex items-center gap-2 shrink-0">
      {user ? (
        <>
          <span className="text-sm text-[var(--color-text-secondary)] truncate max-w-[140px]" title={user.email}>
            {user.email}
          </span>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <Link to="/signin" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
            Sign in
          </Link>
          <Link to="/signup">
            <Button variant="secondary" className="!py-1.5 !px-3 text-sm">
              Sign up
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

export function AppLayout({ children, breadcrumbs, headerRight }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-text-secondary)]/20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <nav className="flex items-center gap-2 text-sm min-w-0" aria-label="Breadcrumb">
              <Link
                to="/"
                className="font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] truncate"
              >
                StudyFlow
              </Link>
              {breadcrumbs?.map((item, i) => (
                <span key={i} className="flex items-center gap-2 text-[var(--color-text-secondary)] shrink-0">
                  <span aria-hidden>/</span>
                  {item.href ? (
                    <Link to={item.href} className="hover:text-[var(--color-primary)] truncate max-w-[180px]">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="truncate max-w-[180px]" aria-current="page">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
            <div className="flex items-center gap-3 flex-wrap">
              {headerRight}
              <AuthHeader />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

export function NewSetButton() {
  return (
    <Link to="/sets/new">
      <Button>
        <Plus className="w-4 h-4" /> New set
      </Button>
    </Link>
  );
}
