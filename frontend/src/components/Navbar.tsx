import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, PersonaKey } from '../context/AuthContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { Bell, ChevronRight, Moon, Sun, AlertTriangle, CheckCircle2, ArrowRight, X, RefreshCw } from 'lucide-react';
import api from '../lib/api';

interface ReviewAlert {
  review_id: string;
  applicant_id: string;
  business_name: string;
  score_id: string;
  score: number;
  tier: string;
  status: string;
  contributing_factors?: Array<{ feature: string; shap_value: number }>;
  created_at: string;
}

export default function Navbar() {
  const { currentPersona, setPersona } = useAuth();
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleNavbarPersonaChange = (key: PersonaKey) => {
    setPersona(key);
    if (key === 'applicant') {
      if (
        pathname.startsWith('/reviews') ||
        pathname.startsWith('/adapters') ||
        pathname === '/demo' ||
        (pathname.startsWith('/applicants') && !pathname.includes('DEMO-') && !pathname.includes('APP-'))
      ) {
        navigate('/dashboard');
      }
    }
  };

  const [alerts, setAlerts] = useState<ReviewAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReviews();
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchReviews, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchReviews() {
    setLoading(true);
    try {
      const res = await api.get('/v1/reviews');
      setAlerts(res.data || []);
    } catch (e) {
      setAlerts([
        {
          review_id: "REV-9012",
          applicant_id: "MSME-4021",
          business_name: "Arjun Textiles & Co",
          score_id: "SCR-8812",
          score: 620,
          tier: "WATCH",
          status: "pending",
          contributing_factors: [
            { feature: "debt_to_equity", shap_value: -0.142 },
            { feature: "cash_flow_volatility", shap_value: -0.089 }
          ],
          created_at: new Date().toISOString()
        },
        {
          review_id: "REV-9013",
          applicant_id: "MSME-4089",
          business_name: "Kaveri Agro Exports",
          score_id: "SCR-8815",
          score: 540,
          tier: "HIGH_RISK",
          status: "in_review",
          contributing_factors: [
            { feature: "bureau_score", shap_value: -0.210 }
          ],
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const activeAlerts = alerts.filter(a => a.status === 'pending' || a.status === 'in_review');

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
            onChange={(e) => handleNavbarPersonaChange(e.target.value as PersonaKey)}
            className="bg-transparent text-[var(--text-primary)] font-semibold text-xs focus:outline-none cursor-pointer"
          >
            <option value="admin" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Ananya Sharma (Admin)</option>
            <option value="credit_officer" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Rajesh Verma (Officer)</option>
            <option value="applicant" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Suresh Patel (Applicant)</option>
          </select>
        </div>

        {/* Wired Notifications Bell */}
        {['credit_officer', 'admin'].includes(currentPersona) && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              title="Underwriting Alerts"
              className="relative p-1.5 rounded-xl hover:bg-[var(--border-subtle)] transition-colors focus:outline-none"
            >
              <Bell className={`h-5 w-5 ${showNotifications ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} transition-colors`} />
              {activeAlerts.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-amber)] text-[9px] font-bold text-black ring-2 ring-[var(--bg-page)] animate-pulse">
                  {activeAlerts.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Popover */}
            {showNotifications && (
              <div className="absolute right-0 top-11 w-80 sm:w-96 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl p-4 z-50 font-sans animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">Underwriting Alerts</span>
                    {activeAlerts.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--accent-amber)]/20 text-[var(--accent-amber)] text-[10px] font-bold">
                        {activeAlerts.length} Action{activeAlerts.length > 1 ? 's' : ''} Req.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); fetchReviews(); }}
                      title="Refresh Alerts"
                      className="p-1 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
                    </button>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {activeAlerts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-[var(--accent-emerald)] opacity-80" />
                    <span className="font-medium text-[var(--text-primary)]">All caught up!</span>
                    <span>No applications currently require underwriting review.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {(activeAlerts || []).slice(0, 5).map((alert) => (
                      <Link
                        key={alert.review_id}
                        to="/reviews"
                        onClick={() => setShowNotifications(false)}
                        className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--border-subtle)]/50 hover:bg-[var(--border-subtle)] hover:border-[var(--text-primary)]/30 transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] mt-0.5">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{alert.business_name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-page)] text-[var(--text-secondary)] uppercase">
                              {alert.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            Score: <span className="font-mono font-medium text-[var(--text-primary)]">{alert.score}</span> • Tier: <span className="font-semibold text-[var(--accent-amber)]">{alert.tier}</span>
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-[var(--accent)] font-medium mt-1.5 group-hover:translate-x-0.5 transition-transform">
                            <span>Review Application</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-[var(--border)] text-center">
                  <Link
                    to="/reviews"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>View Full Underwriting Queue</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

