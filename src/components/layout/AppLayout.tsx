import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Globe, Users, Library, Menu, X } from 'lucide-react';
import { Button } from '../ui';
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
  sidebar?: React.ReactNode;
}

function AuthButton() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-sm text-[var(--color-text-secondary)] truncate max-w-[120px] font-medium hidden sm:inline"
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
      </div>
    );
  }

  return (
    <Link to="/signin">
      <Button variant="secondary" size="sm" className="font-medium">
        {t('signIn')}
      </Button>
    </Link>
  );
}

const navLinkClasses = (isActive: boolean) =>
  `flex items-center gap-1.5 text-sm font-medium transition-colors duration-[var(--duration-fast)] px-3 py-1.5 rounded-[var(--radius-sm)] ${
    isActive
      ? 'text-[var(--color-primary)] bg-[var(--color-primary-muted)]'
      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]'
  }`;

function NavLinks({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <>
      <Link to="/" className={navLinkClasses(location.pathname === '/')} onClick={onClick}>
        <Library className="w-4 h-4" />
        {t('yourStudySets')}
      </Link>
      <Link to="/explore" className={navLinkClasses(location.pathname === '/explore')} onClick={onClick}>
        <Globe className="w-4 h-4" />
        {t('explore')}
      </Link>
      <Link to="/shared" className={navLinkClasses(location.pathname === '/shared')} onClick={onClick}>
        <Users className="w-4 h-4" />
        {t('sharedWithMe')}
      </Link>
    </>
  );
}

export function AppLayout({ children, breadcrumbs, headerRight, sidebar }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-background)] transition-colors duration-[var(--duration-slow)]">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--color-primary)] focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-10 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--duration-slow)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Left: Logo + Navigation */}
            <nav
              className="flex items-center gap-2 text-sm shrink-0"
              aria-label="Main navigation"
            >
              <Link
                to="/"
                className="font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] truncate transition-colors duration-[var(--duration-fast)] text-lg tracking-tight"
              >
                StudyFlow
              </Link>
              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-1">
                <NavLinks />
              </div>
              {breadcrumbs?.map((item, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 text-[var(--color-text-secondary)] shrink-0 hidden sm:flex"
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

            {/* Center: Page-specific content */}
            {headerRight && (
              <div className="flex-1 flex items-center justify-center">
                {headerRight}
              </div>
            )}

            {/* Right: Auth only (settings moved to More menu) */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <AuthButton />
            </div>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              <NavLinks onClick={() => setMobileMenuOpen(false)} />
            </nav>
            {/* Mobile sidebar content */}
            {sidebar && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                {sidebar}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main content with optional sidebar */}
      <div className={`mx-auto px-4 sm:px-6 py-6 sm:py-8 ${sidebar ? 'max-w-6xl md:flex gap-6' : 'max-w-4xl'}`}>
        {sidebar && (
          <aside className="w-64 shrink-0 hidden md:block">
            <div className="sticky top-24 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
              {sidebar}
            </div>
          </aside>
        )}
        <main id="main-content" className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export function NewSetButton() {
  const { t } = useTranslation();

  return (
    <Link to="/sets/new">
      <Button className="gap-2 shadow-[var(--shadow-sm)] whitespace-nowrap">
        <Plus className="w-4 h-4 shrink-0" aria-hidden />
        {t('newSet')}
      </Button>
    </Link>
  );
}
