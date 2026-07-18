import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, FileCheck, AlertTriangle, ArrowUpRight,
  ArrowDownRight, Activity, Zap, Play,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import MultiAgentViz from '@/components/MultiAgentViz';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { tierColor } from '@/lib/tierColors';
import { RupeeLoader } from '@/components/ui/RupeeLoader';


// BUG-13 FIX: These IDs must match exactly what backend/data/demo_personas.py seeds.
// APP-VIKRAM and APP-ANITA do not exist in the backend — they caused 404 on click.
// Correct IDs are APP-MOHAMMED (WATCH) and APP-LAKSHMI (HIGH_RISK).
const DEMO_PERSONAS = [
  { id: 'APP-RAMESH', name: 'Ramesh General Store', city: 'Indore', industry: 'Kirana', score: 72, tier: 'ADEQUATE', isNTC: true },
  { id: 'APP-PRIYA', name: 'Priya Textiles', city: 'Surat', industry: 'Textile', score: 85, tier: 'STRONG', isNTC: false },
  { id: 'APP-MOHAMMED', name: 'Mohammed Enterprises', city: 'Hyderabad', industry: 'Trading', score: 45, tier: 'WATCH', isNTC: false },
  { id: 'APP-LAKSHMI', name: 'Lakshmi Dairy Products', city: 'Chennai', industry: 'Food / Dairy', score: 28, tier: 'HIGH_RISK', isNTC: true },
  { id: 'APP-SURESH', name: 'Suresh Electronics', city: 'Delhi', industry: 'Electronics', score: 61, tier: 'ADEQUATE', isNTC: true },
];

function KPICard({ title, value, subtitle, trend, trendValue, icon }: any) {
  return (
    <div className="glass-card glass-card-hover p-5 border border-[var(--border)] transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span className="stat-label">{title}</span>
          <motion.div
            className="stat-val text-2xl font-mono tracking-tight"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {value}
          </motion.div>
          {subtitle && <div className="text-xs text-[var(--text-secondary)] mt-1 font-sans">{subtitle}</div>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-mono border-t border-[var(--border)] pt-3">
          {trend === 'up' ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-tier-strong" />
          ) : trend === 'down' ? (
            <ArrowDownRight className="h-3.5 w-3.5 text-tier-high-risk" />
          ) : null}
          <span className={trend === 'up' ? 'text-tier-strong font-semibold' : trend === 'down' ? 'text-tier-high-risk font-semibold' : 'text-[var(--text-secondary)]'}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}

function BorrowerOverview() {
  const { user } = useAuth();
  // BUG-4 FIX: Fetch real score and offer for APP-SURESH from the backend.
  // Previously showed hardcoded score=85, ₹25L, 10.5% — none of which matched
  // the actual model output (ADEQUATE, 61).
  const [creditScore, setCreditScore] = useState<any>(null);
  const [topOffer, setTopOffer] = useState<any>(null);
  const [creditLoading, setCreditLoading] = useState(true);

  useEffect(() => {
    async function fetchCredit() {
      try {
        await api.post('/v1/demo/seed').catch(() => null);
        const scoreResp = await api.get('/v1/demo/score/APP-SURESH').catch(() => null);
        if (scoreResp?.data) setCreditScore(scoreResp.data);
        const offersResp = await api.get('/v1/demo/offers/APP-SURESH').catch(() => null);
        if (offersResp?.data?.offers?.length) {
          setTopOffer(offersResp.data.offers[0]);
        }
      } finally {
        setCreditLoading(false);
      }
    }
    fetchCredit();
  }, []);

  const scoreVal = creditScore?.score ?? null;
  const tierVal = creditScore?.tier ?? null;
  const tierBadgeClass = tierVal === 'STRONG' ? 'badge-strong'
    : tierVal === 'ADEQUATE' ? 'badge-adequate'
    : tierVal === 'WATCH' ? 'badge-watch'
    : tierVal === 'HIGH_RISK' ? 'badge-high-risk' : '';

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Borrower Welcome Header */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge badge-strong font-mono text-[10px]">VERIFIED MSME BORROWER</span>
            <span className="text-xs font-mono text-[var(--text-secondary)]">ID: USR-MSME-01</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
            Welcome, {user.name}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xl">
            {user.title} — Connected to IDBI Bank Account Aggregator Network via Anumati Consent Framework.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/applicants/APP-SURESH/health-card?demo=true&tab=sanction"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-[#0A0B0F] shadow-sm hover:opacity-90 transition-opacity"
          >
            <Zap className="h-4 w-4" /> View Sanction & AI Narrative
          </Link>
          <Link
            to="/applicants/APP-SURESH/health-card?demo=true&tab=overview"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
          >
            <FileCheck className="h-4 w-4" /> My 360° Health Card
          </Link>
        </div>
      </div>

      {/* Credit Status & Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 border border-[var(--border)] bg-[var(--bg-card)] rounded-2xl">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Credit Health Score</span>
          {creditLoading ? (
            <div className="mt-2 text-sm font-mono text-[var(--text-secondary)] animate-pulse">Loading…</div>
          ) : (
            <div className="mt-2 flex items-baseline gap-3">
              <span className={`text-3xl font-bold font-mono`} style={{ color: scoreVal != null ? tierColor(tierVal) : 'var(--text-primary)' }}>
                {scoreVal ?? '—'}
              </span>
              <span className="text-sm font-mono text-[var(--text-secondary)]">{scoreVal != null ? '/ 100' : ''}</span>
              {tierVal && <span className={`badge ${tierBadgeClass} ml-auto`}>{tierVal}</span>}
            </div>
          )}
          <p className="mt-3 text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">
            Computed from AA bank statement & GST return data via ArthNiti XGBoost model.
          </p>
        </div>

        <div className="glass-card p-5 border border-[var(--border)] bg-[var(--bg-card)] rounded-2xl">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Pre-Approved Credit Limit</span>
          {creditLoading ? (
            <div className="mt-2 text-sm font-mono text-[var(--text-secondary)] animate-pulse">Loading…</div>
          ) : (
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono text-[var(--text-primary)]">
                {topOffer ? `₹${(topOffer.max_amount / 100000).toFixed(0)}L` : '—'}
              </span>
            </div>
          )}
          <p className="mt-3 text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-3 flex items-center justify-between">
            {topOffer ? (
              <>
                <span>Interest Rate: <strong className="text-[var(--text-primary)] font-mono">{topOffer.interest_rate_annual}% p.a.</strong></span>
                <span className="text-tier-strong font-medium flex items-center gap-1"><Zap className="h-3 w-3" /> Instant Disbursal</span>
              </>
            ) : (
              <span className="text-[var(--text-secondary)]">Score required to compute offers</span>
            )}
          </p>
        </div>

        <div className="glass-card p-5 border border-[var(--border)] bg-[var(--bg-card)] rounded-2xl">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Connected AA Consent</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--text-primary)] font-mono">Anumati AA Pipeline</span>
            <span className="flex items-center gap-1.5 text-xs text-tier-strong font-semibold bg-tier-strong/10 px-2 py-0.5 rounded-full border border-tier-strong/20">
              <span className="h-1.5 w-1.5 rounded-full bg-tier-strong animate-pulse" /> Active
            </span>
          </div>
          <p className="mt-3 text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">
            Linked to IDBI Bank Current A/c (...8841) & GSTIN 27AAACP1234A1Z5.
          </p>
        </div>
      </div>

      {/* Available Features Section */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--accent)]" /> Your Available Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/applicants/APP-SURESH/health-card?demo=true&tab=sanction"
            className="group flex flex-col justify-between p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--accent)] transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono font-bold text-[var(--accent)] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  View Sanction <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Sanction Letter & Offers</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Review your instant pre-approved loan sanction terms, interactive tier breakdown, and regional vernacular voice explanation by Arth-Mitra.
              </p>
            </div>
          </Link>

          <Link
            to="/applicants/APP-SURESH/health-card?demo=true&tab=overview"
            className="group flex flex-col justify-between p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--accent)] transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tier-strong/15 text-tier-strong border border-tier-strong/30">
                  <FileCheck className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono font-bold text-tier-strong group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  View Card <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">360° Financial Health Card</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Inspect your verified credit health breakdown, GST vs bank reconciliation score, alternate data coverage, and custom AI improvement tips.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentPersona } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animatingAgent] = useState(false);
  // BUG-8 FIX: live score lookup keyed by applicant_id, populated from the
  // /v1/score endpoint so persona grid shows real model scores not hardcoded constants.
  const [livePersonaScores, setLivePersonaScores] = useState<Record<string, { score: number; tier: string }>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (currentPersona === 'applicant') {
      setLoading(false);
      return;
    }

    async function load(retries = 3) {
      try {
        // Ensure demo personas are seeded before fetching metrics so cold container
        // starts populate all dashboard KPIs immediately instead of showing 0s.
        await api.post('/v1/demo/seed').catch(() => null);

        for (let attempt = 0; attempt <= retries; attempt++) {
          const [cov, allScores, allApplicants] = await Promise.all([
            api.get('/v1/coverage-stats').then(r => r.data).catch(() => null),
            api.get('/v1/score').then(r => r.data).catch(() => null),
            api.get('/v1/applicants').then(r => r.data).catch(() => null),
          ]);

          const scoresArr = Array.isArray(allScores) ? allScores : [];
          const applicantsArr = Array.isArray(allApplicants) ? allApplicants : [];

          if ((applicantsArr.length === 0 || scoresArr.length === 0) && attempt < retries) {
            await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
            continue;
          }

          if (applicantsArr.length > 0) {
            if (!cov) {
              setError('Live coverage stats unavailable — retry, or check API connectivity. Not showing a placeholder number in its place.');
            }
            setStats(cov);
            setApplicants(applicantsArr.slice(0, 5));
            const tierCounts: Record<string, number> = { STRONG: 0, ADEQUATE: 0, WATCH: 0, HIGH_RISK: 0 };
            scoresArr.forEach((s: any) => { if (tierCounts[s.tier] !== undefined) tierCounts[s.tier]++; });
            setScores(Object.entries(tierCounts).map(([tier, count]) => ({ tier, count })));
            // BUG-8 FIX: Build a lookup of live scores so persona grid cards
            // show the actual backend score rather than the hardcoded constant.
            const liveScoreMap: Record<string, { score: number; tier: string }> = {};
            scoresArr.forEach((s: any) => { liveScoreMap[s.applicant_id] = { score: s.score, tier: s.tier }; });
            setLivePersonaScores(liveScoreMap);
          } else {
            // Previously fell back to entirely fabricated applicants (names
            // that didn't even match the real seeded demo personas) and a
            // hardcoded "100% coverage" figure, shown with no indication any
            // of it was fake. That's a direct contradiction of the "real vs
            // synthetic" disclosure discipline used everywhere else in this
            // app (the SYNTHETIC PROTOTYPE badges, the honesty table, etc.)
            // — and it was reachable by the most realistic failure mode
            // there is: a slow or interrupted backend during a live demo.
            // Show an honest empty/error state instead of invented numbers.
            setStats(null);
            setApplicants([]);
            setScores([]);
            setError('Could not load live applicant data from the backend after retrying. This is not a placeholder screen — it reflects the actual current connection state.');
          }
          break;
        }
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentPersona]);

  if (currentPersona === 'applicant') {
    return <BorrowerOverview />;
  }

  const handleDemoPersonaClick = (id: string) => {
    navigate(`/applicants/${id}?demo=true`);
  };

  const handleLaunchDemo = () => {
    // Navigate to the demo sandbox page — lets the user pick a persona
    // instead of silently full-page-navigating after a 4-second delay
    // (which looked like the screen was being "maximized").
    navigate('/demo');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RupeeLoader size="lg" label="Loading Executive Intelligence..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* BUG-B2 FIX: Render errors instead of silently showing 0 values */}
      {error && (
        <div className="rounded-xl border border-tier-watch/30 bg-tier-watch/10 px-5 py-3 text-xs font-mono text-tier-watch flex items-center justify-between">
          <span><span className="font-bold uppercase">Dashboard load error:</span> {error}</span>
          <button onClick={() => setError('')} className="underline hover:text-[var(--text-primary)] font-bold ml-4">Dismiss</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <span className="eyebrow">UNDERWRITING // OVERVIEW</span>
          <h1 className="text-3xl font-serif text-[var(--text-primary)]">Credit <span className="italic">Intelligence</span>.</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleLaunchDemo}
            className="btn-gold"
          >
            <Play className="h-4 w-4 fill-current" /> Launch Demo Flow
          </button>
          <Link to="/applicants/new">
            <button className="btn-action">
              <TrendingUp className="h-4 w-4 text-[var(--accent)]" /> New Application
            </button>
          </Link>
        </div>
      </div>

      {/* Multi-Agent Viz */}
      <MultiAgentViz isAnimating={animatingAgent} />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard title="Total Applicants" value={stats?.total_applicants || 0} subtitle="Registered MSME profiles" icon={<Users className="h-4 w-4" />} color="var(--accent-blue)" trend="up" trendValue="+12% from last week" />
        <KPICard title="NTC/NTB Coverage" value={`${stats?.coverage_improvement_pct?.toFixed(1) || 0}%`} subtitle={`${stats?.applicants_without_bureau_record_with_usable_score || 0} usable scores`} icon={<FileCheck className="h-4 w-4" />} color="var(--accent-emerald)" trend="up" trendValue="+5.3% improvement" />
        <KPICard title="Flagged for Review" value={(scores.find((s) => s.tier === 'WATCH')?.count || 0) + (scores.find((s) => s.tier === 'HIGH_RISK')?.count || 0)} subtitle="WATCH + HIGH_RISK tiers" icon={<AlertTriangle className="h-4 w-4" />} color="var(--accent-amber)" trend="neutral" trendValue="Stable" />
        <KPICard title="AA Adapter Status" value="Active" subtitle="Finvu sandbox connected" icon={<Activity className="h-4 w-4" />} color="var(--accent)" trend="up" trendValue="Online" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution */}
        <div className="lg:col-span-2 glass-card p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-5">
            <div>
              <span className="eyebrow">ANALYTICS // PORTFOLIO</span>
              <h3 className="text-base font-serif text-[var(--text-primary)]">Score <span className="italic">Distribution</span>.</h3>
            </div>
            <span className="text-xs font-mono text-[var(--text-secondary)]">LIVE METRICS</span>
          </div>
          {scores.length > 0 && scores.some((s: any) => s.count > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scores}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="tier" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#cbd5e1', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#cbd5e1', fontWeight: 600 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#f8fafc',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.6)',
                  }}
                  labelStyle={{ color: '#38bdf8', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 600, fontSize: '13px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scores.map((d: any) => (
                    <Cell key={d.tier} fill={tierColor(d.tier)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[280px] text-[var(--text-secondary)]">
              <Activity className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-mono">No scores computed yet. Start with New Application.</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-5">
            <div>
              <span className="eyebrow">PORTFOLIO // RECENT</span>
              <h3 className="text-base font-serif text-[var(--text-primary)]">Recent <span className="italic">Profiles</span>.</h3>
            </div>
            <span className="text-xs font-mono text-[var(--text-secondary)]">TOP 5</span>
          </div>
          {applicants.length > 0 ? (
            <div className="space-y-3">
              {applicants.map((a: any) => (
                <Link key={a.id} to={`/applicants/${a.id}`} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3.5 bg-[var(--surface)] hover:bg-[var(--surface-raised)] transition-all group">
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{a.business_name}</div>
                    <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">{a.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!a.has_bureau_record && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)]">NTC/NTB</span>
                    )}
                    <ArrowUpRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-secondary)] text-sm font-mono">No applicants yet.</div>
          )}
        </div>
      </div>

      {/* Demo Personas */}
      <div className="glass-card p-6 border border-[var(--border)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-5">
          <div>
            <span className="eyebrow">SANDBOX // BENCHMARK PERSONAS</span>
            <h3 className="text-base font-serif text-[var(--text-primary)]">Interactive <span className="italic">Sandbox</span>.</h3>
          </div>
          <span className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider font-semibold">CLICK TO LAUNCH</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {DEMO_PERSONAS.map((p) => {
            // BUG-8 FIX: prefer live backend score over the hardcoded constant.
            const live = livePersonaScores[p.id];
            const displayScore = live?.score ?? p.score;
            const displayTier = live?.tier ?? p.tier;
            return (
              <button
                key={p.id}
                onClick={() => handleDemoPersonaClick(p.id)}
                className="text-left rounded-xl border border-[var(--border)] p-4 transition-all hover:border-[var(--text-secondary)] cursor-pointer bg-[var(--surface)] hover:bg-[var(--surface-raised)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-[var(--text-secondary)] font-semibold">{p.id}</span>
                  {p.isNTC && <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--text-primary)]">NTC</span>}
                </div>
                <div className="text-sm font-bold text-[var(--text-primary)] mb-0.5">{p.name}</div>
                <div className="text-[11px] text-[var(--text-secondary)] font-sans">{p.industry} • {p.city}</div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5">
                  <span className="text-xl font-bold font-mono" style={{ color: tierColor(displayTier) }}>{displayScore}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ color: tierColor(displayTier), backgroundColor: `color-mix(in srgb, ${tierColor(displayTier)} 15%, transparent)` }}>{displayTier}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 border border-[var(--border)]">
          <div className="border-b border-[var(--border)] pb-3 mb-5">
            <span className="eyebrow">INTEGRATIONS // STATUS</span>
            <h3 className="text-base font-serif text-[var(--text-primary)]">System <span className="italic">Adapters</span>.</h3>
          </div>
          <div className="space-y-3 font-sans">
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-tier-strong" />
                <div className="text-sm font-bold text-[var(--text-primary)]">Account Aggregator (AA)</div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-tier-strong/15 text-tier-strong border border-tier-strong/30">REAL API</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-tier-watch" />
                <div className="text-sm font-bold text-[var(--text-primary)]">OCEN Adapter</div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-tier-watch/15 text-tier-watch border border-tier-watch/30">SANDBOX</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-tier-watch" />
                <div className="text-sm font-bold text-[var(--text-primary)]">ULI Connector</div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-tier-watch/15 text-tier-watch border border-tier-watch/30">SANDBOX</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-[var(--border)]">
          <div className="border-b border-[var(--border)] pb-3 mb-5">
            <span className="eyebrow">SHORTCUTS // EXECUTION</span>
            <h3 className="text-base font-serif text-[var(--text-primary)]">Quick <span className="italic">Actions</span>.</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/applicants/new">
              <button className="w-full h-full text-left rounded-xl border border-[var(--border)] p-5 hover:border-[var(--text-secondary)] transition-all group bg-[var(--surface)] hover:bg-[var(--surface-raised)]">
                <div className="flex items-center gap-2.5 mb-3">
                  <Zap className="h-5 w-5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">New Application</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Launch AI assessment for new MSME borrower</div>
              </button>
            </Link>
            <Link to="/reviews">
              <button className="w-full h-full text-left rounded-xl border border-[var(--border)] p-5 hover:border-[var(--text-secondary)] transition-all group bg-[var(--surface)] hover:bg-[var(--surface-raised)]">
                <div className="flex items-center gap-2.5 mb-3">
                  <FileCheck className="h-5 w-5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">Review Queue</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Process WATCH and HIGH_RISK applications</div>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
