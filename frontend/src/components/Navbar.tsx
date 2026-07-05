import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { Bell, ChevronRight, Moon, Sun } from 'lucide-react';

export default function Navbar() {
  const { currentPersona, setPersona } = useAuth();
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();

  const breadcrumbs = [
    { label: 'Home', to: '/dashboard' },
    ...(pathname === '/dashboard' ? [{ label: 'Dashboard' }] : []),
    ...(pathname === '/applicants' ? [{ label: 'MSME Profiles' }] : []),
    ...(pathname === '/applicants/new' ? [{ label: 'MSME Profiles', to: '/applicants' }, { label: 'New Application' }] : []),
    ...(pathname.startsWith('/applicants/') && !pathname.includes('/new') ? [{ label: 'MSME Profiles', to: '/applicants' }, { label: 'Profile Details' }] : []),
    ...(pathname === '/reviews' ? [{ label: 'Underwriting' }] : []),
    ...(pathname === '/adapters' ? [{ label: 'System Adapters' }] : []),
  ];

  const themes: { id: Theme; label: string; icon: any }[] = [
    { id: 'noir', label: 'Noir', icon: Moon },
    { id: 'blanc', label: 'Blanc', icon: Sun },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-page)] px-6 transition-colors duration-200">
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-sans">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-[var(--text-primary)] transition-colors">{crumb.label}</Link>
              ) : (
                <span className="font-semibold text-[var(--text-primary)] tracking-tight">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Swiss Theme Switcher */}
        <div className="flex items-center gap-1 rounded-full p-1 border border-[var(--border)] bg-[var(--border-subtle)] transition-colors">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                title={`Switch to Atelier ${t.label}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Persona Selector */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--border-subtle)] rounded-xl px-3 py-1.5 border border-[var(--border)]">
          <span className="font-medium">Persona:</span>
          <select
            value={currentPersona}
            onChange={(e) => setPersona(e.target.value as any)}
            className="bg-transparent text-[var(--text-primary)] font-semibold text-xs focus:outline-none cursor-pointer"
          >
            <option value="admin" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Ananya Sharma (Admin)</option>
            <option value="credit_officer" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Rajesh Verma (Officer)</option>
            <option value="applicant" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Suresh Patel (Applicant)</option>
          </select>
        </div>

        <div className="relative">
          <Bell className="h-5 w-5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent-amber)] ring-2 ring-[var(--bg-page)]" />
        </div>
      </div>
    </header>
  );
}
