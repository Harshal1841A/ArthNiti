import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RupeeLoader } from '../components/ui/RupeeLoader';
import api from '../lib/api';

interface ReviewItem {
  review_id: string;
  applicant_id: string;
  business_name: string;
  score_id: string;
  score: number;
  tier: string;
  contributing_factors: Array<{ feature: string; shap_value: number }>;
  status: string;
  assigned_officer?: string;
  notes?: string;
  created_at: string;
}

export default function ReviewQueuePage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue(retries = 4) {
    setLoading(true);
    setError('');
    setIsFallback(false);

    await api.post('/v1/demo/seed').catch(() => null);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await api.get('/v1/reviews?limit=100');
        const data = Array.isArray(res.data) ? res.data : [];

        if (data.length === 0 && attempt < retries) {
          // Empty result — background seeding may still be running.
          // Wait and retry rather than immediately showing placeholder data.
          setError(`Seeding demo data... (attempt ${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }

        setReviews(data);
        setError('');
        setLoading(false);
        return;
      } catch (e: any) {
        if (attempt < retries) {
          setError(`Connecting to queue... (attempt ${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        // All retries exhausted — show fallback mock data
        setError('Failed to load underwriting queue — showing placeholder data. Refresh to retry.');
        setIsFallback(true);
        setReviews([
          {
            review_id: "REV-9012",
            applicant_id: "MSME-4021",
            business_name: "Arjun Textiles & Co",
            score_id: "SCR-8812",
            score: 620,
            tier: "WATCH",
            contributing_factors: [
              { feature: "debt_to_equity", shap_value: -0.142 },
              { feature: "cash_flow_volatility", shap_value: -0.089 },
              { feature: "gst_compliance_score", shap_value: 0.045 }
            ],
            status: "pending",
            created_at: new Date().toISOString()
          },
          {
            review_id: "REV-9013",
            applicant_id: "MSME-4089",
            business_name: "Kaveri Agro Exports",
            score_id: "SCR-8815",
            score: 540,
            tier: "HIGH_RISK",
            contributing_factors: [
              { feature: "bureau_score", shap_value: -0.210 },
              { feature: "working_capital_ratio", shap_value: -0.115 }
            ],
            status: "in_review",
            assigned_officer: "Rajesh Verma",
            notes: "Initial review started. Awaiting bank statement verification.",
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ]);
        break;
      }
    }
    setLoading(false);
  }

  async function handleAssign(id: string) {
    if (!user) return;
    if (isFallback) {
      setActionError('Cannot assign — queue loaded from offline fallback. Refresh the page to connect to the live database.');
      return;
    }
    setActionError('');
    try {
      const res = await api.post(`/v1/reviews/${id}/assign`, { officer_name: user.name });
      setReviews(prev => prev.map(item => item.review_id === id ? res.data : item));
    } catch (e: any) {
      setActionError(e.response?.data?.detail || 'Assignment failed — review item not found in database.');
    }
  }

  async function handleResolve(id: string, decision: 'approved' | 'rejected') {
    if (isFallback) {
      setActionError('Cannot resolve — queue loaded from offline fallback. Refresh the page to connect to the live database.');
      return;
    }
    const notes = actionNotes[id] || `${decision.toUpperCase()} by ${user?.name || 'Underwriter'}`;
    setActionError('');
    try {
      const res = await api.post(`/v1/reviews/${id}/resolve`, { decision, notes });
      setReviews(prev => prev.map(item => item.review_id === id ? res.data : item));
    } catch (e: any) {
      setActionError(e.response?.data?.detail || 'Resolution failed.');
    }
  }

  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const inReviewCount = reviews.filter(r => r.status === 'in_review').length;
  const resolvedCount = reviews.filter(r => ['approved', 'rejected'].includes(r.status)).length;

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <span className="eyebrow">UNDERWRITING // PORTAL</span>
          <h1 className="text-3xl font-serif text-[var(--text-primary)]">Review <span className="italic">Queue</span>.</h1>
        </div>
        <button
          onClick={() => fetchQueue()}
          disabled={loading}
          className="btn-action"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} /> Refresh Queue
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-6 border border-[var(--border)]">
          <span className="stat-label">Pending Allocation</span>
          <div className="stat-val text-2xl font-mono tracking-tight">{pendingCount}</div>
        </div>
        <div className="glass-card p-6 border border-[var(--border)]">
          <span className="stat-label">Active Underwriting</span>
          <div className="stat-val text-2xl font-mono tracking-tight">{inReviewCount}</div>
        </div>
        <div className="glass-card p-6 border border-[var(--border)]">
          <span className="stat-label">Determinations Finalized</span>
          <div className="stat-val text-2xl font-mono tracking-tight">{resolvedCount}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-tier-high-risk/30 bg-tier-high-risk/10 p-5 text-sm text-tier-high-risk flex items-start gap-3 font-mono">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-tier-watch/40 bg-tier-watch/10 p-4 text-sm text-tier-watch flex items-start justify-between gap-3 font-mono">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {actionError}
          </div>
          <button onClick={() => setActionError('')} className="text-tier-watch/60 hover:text-tier-watch text-lg leading-none shrink-0">×</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RupeeLoader size="lg" label="Retrieving Risk Determinations..." />
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-card py-20 text-center border border-[var(--border)]">
          <FileCheck className="h-12 w-12 mx-auto mb-3 text-[var(--text-secondary)] opacity-40" />
          <p className="text-[var(--text-primary)] text-base font-bold font-serif">No flagged applications awaiting review</p>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-1">All WATCH and HIGH_RISK profiles have been resolved or underwritten</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map(item => (
            <div key={item.review_id} className="glass-card overflow-hidden border border-[var(--border)] border-l-4 transition-all hover:border-[var(--text-secondary)]" style={{ borderLeftColor: item.tier === 'HIGH_RISK' ? 'var(--tier-high-risk)' : 'var(--tier-watch)' }}>
              <div className="p-6 border-b border-[var(--border)] bg-[var(--surface)]">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">{item.business_name}</h3>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider" style={{ color: item.tier === 'HIGH_RISK' ? 'var(--tier-high-risk)' : 'var(--tier-watch)', borderColor: item.tier === 'HIGH_RISK' ? 'var(--tier-high-risk)' : 'var(--tier-watch)' }}>{item.tier}</span>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-[var(--border)] text-[var(--text-primary)] uppercase">{item.status}</span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1.5 font-mono">
                      Dossier ID: {item.applicant_id} • AI Risk Score: {item.score}/100 • Flagged: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <Link to={`/applicants/${item.applicant_id}`}>
                    <button className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all bg-[var(--surface-raised)]">
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-5">
                    <div>
                      <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Key SHAP Determinants (AI Explainability)</h4>
                      <div className="flex flex-wrap gap-2">
                        {(item.contributing_factors || []).slice(0, 5).map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3.5 py-2 text-xs font-mono">
                            <span className="text-[var(--text-secondary)]">{f?.feature ? f.feature.replace(/_/g, ' ') : 'Factor'}:</span>
                            <span className={`font-bold ${(f?.shap_value || 0) < 0 ? 'text-tier-high-risk' : 'text-tier-strong'}`}>
                              {typeof f?.shap_value === 'number' ? (f.shap_value > 0 ? `+${f.shap_value.toFixed(4)}` : f.shap_value.toFixed(4)) : '0.0000'}
                            </span>
                            {(f?.shap_value || 0) < 0 ? <TrendingDown className="h-3.5 w-3.5 text-tier-high-risk" /> : <TrendingUp className="h-3.5 w-3.5 text-tier-strong" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    {item.notes && (
                      <div className="rounded-xl border border-tier-watch/30 bg-tier-watch/10 p-4 text-xs text-[var(--text-primary)] font-mono">
                        <span className="font-bold text-tier-watch uppercase tracking-wider">Underwriter Determination Notes:</span> {item.notes}
                      </div>
                    )}
                  </div>

                  <div className="border-t md:border-t-0 md:border-l border-[var(--border)] pt-5 md:pt-0 md:pl-8 flex flex-col justify-between space-y-5">
                    <div>
                      <div className="text-xs text-[var(--text-secondary)] mb-1 font-mono uppercase">Assigned Underwriting Officer</div>
                      <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        {item.assigned_officer ? (
                          <><UserCheck className="h-4 w-4 text-tier-strong" /> {item.assigned_officer}</>
                        ) : (
                          <span className="text-[var(--text-muted)] font-mono font-normal">Unassigned Queue</span>
                        )}
                      </div>
                    </div>

                    {user?.role !== 'APPLICANT' && !['approved', 'rejected'].includes(item.status) && (
                      <div className="space-y-3">
                        {!item.assigned_officer ? (
                          <button
                            onClick={() => handleAssign(item.review_id)}
                            disabled={isFallback}
                            title={isFallback ? 'Refresh the page to load live data before assigning' : 'Claim & Assign to Me'}
                            className="w-full btn-gold py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserCheck className="h-4 w-4" /> Claim & Assign to Me
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <input
                              placeholder="Rationale for determination..."
                              value={actionNotes[item.review_id] || ''}
                              onChange={e => setActionNotes({ ...actionNotes, [item.review_id]: e.target.value })}
                              disabled={isFallback}
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] font-sans disabled:opacity-40"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleResolve(item.review_id, 'approved')}
                                disabled={isFallback}
                                title={isFallback ? 'Refresh the page to load live data before resolving' : 'Approve'}
                                className="flex-1 py-2 rounded-xl bg-tier-strong text-white font-mono text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleResolve(item.review_id, 'rejected')}
                                disabled={isFallback}
                                title={isFallback ? 'Refresh the page to load live data before resolving' : 'Reject'}
                                className="flex-1 py-2 rounded-xl bg-tier-high-risk text-white font-mono text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
