import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Settings,
  ChevronRight,
  Zap,
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
  const { pathname } = useLocation();
  const { user } = useAuth();

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/applicants', icon: Users, label: 'MSME Profiles' },
    { to: '/reviews', icon: FileCheck, label: 'Underwriting' },
    { to: '/demo', icon: Zap, label: 'Demo Sandbox' },
    { to: '/adapters', icon: Settings, label: 'Adapters' },
  ];

  const isActive = (to: string) => {
    if (to === '/dashboard') return pathname === '/' || pathname === '/dashboard';
    return pathname.startsWith(to);
  };

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-colors duration-300"
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 font-sans">
        {links.map((link) => {
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`
                group flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] border border-transparent'
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
        <div className="flex items-center gap-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-sm font-bold border border-[var(--accent)]/30">
            {user.name?.charAt(0) || 'A'}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate font-sans">{user.name}</div>
              <div className="text-xs text-[var(--text-secondary)] truncate font-mono">{user.title}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
