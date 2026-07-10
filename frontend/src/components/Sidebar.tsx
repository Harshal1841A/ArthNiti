import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Settings,
  ChevronRight,
  Zap,
  Building2,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  collapsed?: boolean;
}

function LedgerFoldMark() {
  return (
    <svg viewBox="0 0 100 100" className="h-[18px] w-[18px]" xmlns="http://www.w3.org/2000/svg">
      <path d="M50,24 L14,34 L14,82 L50,74 Z" fill="none" stroke="#0A0B0F" strokeWidth="5" />
      <path d="M50,24 L86,34 L86,82 L50,74 Z" fill="#0A0B0F" />
      <line x1="50" y1="24" x2="50" y2="74" stroke="var(--accent)" strokeWidth="4.5" />
    </svg>
  );
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { currentPersona, setPersona, user } = useAuth();
  const persona = currentPersona === 'applicant' ? 'borrower' : 'underwriter';

  const handlePersonaChange = (target: 'borrower' | 'underwriter') => {
    if (target === 'borrower') {
      setPersona('applicant');
      // BUG-A7 FIX: Redirect unless on the borrower's OWN profile (APP-SURESH).
      // Previously any APP-* path was allowed, letting borrowers land on other MSMEs' pages.
      const isOwnProfile = pathname.includes('APP-SURESH');
      if (
        pathname.startsWith('/reviews') ||
        pathname.startsWith('/adapters') ||
        pathname === '/demo' ||
        (pathname.startsWith('/applicants') && !isOwnProfile)
      ) {
        navigate('/dashboard');
      }
    } else {
      setPersona('credit_officer');
    }
  };

  const links =
    persona === 'borrower'
      ? [
          { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
          { to: '/applicants/APP-SURESH/health-card?demo=true&tab=overview', icon: CreditCard, label: '360° Health Card' },
          { to: '/applicants/APP-SURESH/health-card?demo=true&tab=sanction', icon: Zap, label: 'Sanction & Offers' },
        ]
      : [
          { to: '/dashboard', icon: LayoutDashboard, label: 'Risk Dashboard' },
          { to: '/applicants', icon: Users, label: 'MSME Profiles' },
          { to: '/reviews', icon: FileCheck, label: 'Underwriting Queue' },
          { to: '/adapters', icon: Settings, label: 'AA/OCEN Diagnostics' },
          { to: '/demo', icon: Zap, label: 'Instant Loan Demo' },
        ];

  const isActive = (to: string) => {
    if (to === '/dashboard') return pathname === '/' || pathname === '/dashboard';
    if (to.includes('?')) {
      const [pathPart, queryPart] = to.split('?');
      if (pathname !== pathPart) return false;
      const urlParams = new URLSearchParams(queryPart);
      if (urlParams.has('tab')) {
        const tabVal = urlParams.get('tab');
        const currentTab = new URLSearchParams(search).get('tab') || 'overview';
        return currentTab === tabVal;
      }
      return true;
    }
    return pathname.startsWith(to);
  };

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-colors duration-300 shadow-sm"
      style={{ width: collapsed ? 72 : 260 }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-[var(--border)] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[#0A0B0F] font-bold shadow-sm">
          <LedgerFoldMark />
        </div>
        {!collapsed && (
          <div className="ml-3">
            <div className="text-lg font-serif font-bold text-[var(--text-primary)] tracking-tight">Arth<span className="italic">Niti</span></div>
            <div className="text-[10px] text-[var(--text-secondary)] font-mono font-medium uppercase tracking-wider">IDBI Innovate 2026</div>
          </div>
        )}
      </div>

      {/* Persona Switcher Header (Role Access Segregation) */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="flex rounded-xl p-1 bg-[var(--bg-card)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => handlePersonaChange('borrower')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer ${
                persona === 'borrower'
                  ? 'bg-[var(--accent)] text-[#0A0B0F] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" /> Borrower
            </button>
            <button
              type="button"
              onClick={() => handlePersonaChange('underwriter')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer ${
                persona === 'underwriter'
                  ? 'bg-[var(--accent-blue)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Underwriter
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 font-sans">
        {links.map((link) => {
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`
                group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] font-bold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] border border-transparent font-medium'
                }
              `}
            >
              <link.icon className={`h-4 w-4 transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
              {!collapsed && (
                <>
                  <span className="flex-1">{link.label}</span>
                  {active && <ChevronRight className="h-4 w-4 text-[var(--accent)]" />}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] p-3 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-sm font-bold border border-[var(--accent)]/30">
            {user?.name?.charAt(0) || (persona === 'borrower' ? 'M' : 'U')}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate font-sans">
                {user?.name || (persona === 'borrower' ? 'Rajesh Kumar (Kirana)' : 'Vikram Sharma (VP Risk)')}
              </div>
              <div className="text-xs text-[var(--text-secondary)] truncate font-mono">
                {user?.title || (persona === 'borrower' ? 'Verified MSME Account' : 'IDBI Underwriting Lead')}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
