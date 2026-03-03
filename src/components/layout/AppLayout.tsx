import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../ui';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from '../../hooks/useTranslation';

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
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 shrink-0">
      {user ? (
        <>
          <span
            className="text-sm text-[var(--color-text-secondary)] truncate max-w-[180px] font-medium"
            title={user.email}
          >
            {user.email}
          </span>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors duration-[var(--duration-fast)] rounded-[var(--radius-sm)] px-3 py-1.5 hover:bg-[var(--color-danger)]/5"
          >
            {t('signOut')}
          </button>
        </>
      ) : (
        <>
          <Link
            to="/signin"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] rounded-[var(--radius-sm)] px-3 py-1.5 hover:bg-[var(--color-primary-muted)]"
          >
            {t('signIn')}
          </Link>
          <Link to="/signup">
            <Button variant="secondary" size="sm" className="font-medium">
              {t('signUp')}
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

export function AppLayout({ children, breadcrumbs, headerRight }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] transition-colors duration-[var(--duration-slow)]">
      <header className="sticky top-0 z-10 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--duration-slow)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <nav
              className="flex items-center gap-2 text-sm min-w-0"
              aria-label="Breadcrumb"
            >
              <Link
                to="/"
                className="font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] truncate transition-colors duration-[var(--duration-fast)] text-lg tracking-tight"
              >
                StudyFlow
              </Link>
              {breadcrumbs?.map((item, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 text-[var(--color-text-secondary)] shrink-0"
                >
                  <span className="opacity-50" aria-hidden>/</span>
                  {item.href ? (
                    <Link
                      to={item.href}
                      className="hover:text-[var(--color-primary)] truncate max-w-[180px] transition-colors duration-[var(--duration-fast)] font-medium"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="truncate max-w-[180px] font-semibold text-[var(--color-text)]" aria-current="page">
                      {item.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
            <div className="flex items-center gap-3 flex-wrap">
              {headerRight}
              <div className="h-6 w-px bg-[var(--color-border)] mx-1" aria-hidden="true" />
              <LanguageSwitcher />
              <ThemeToggle />
              <AuthHeader />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

export function NewSetButton() {
  const { t } = useTranslation();

  return (
    <Link to="/sets/new">
      <Button className="gap-2 shadow-[var(--shadow-sm)]">
        <Plus className="w-4 h-4 shrink-0" aria-hidden />
        {t('newSet')}
      </Button>
    </Link>
  );
}
