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

const TIER_COLORS: Record<string, string> = {
  STRONG: '#10B981',
  ADEQUATE: '#3B82F6',
  WATCH: '#F59E0B',
  HIGH_RISK: '#F43F5E',
};

const DEMO_PERSONAS = [
  { id: 'APP-RAMESH', name: 'Ramesh General Store', city: 'Indore', industry: 'Kirana', score: 72, tier: 'ADEQUATE', isNTC: true },
  { id: 'APP-PRIYA', name: 'Priya Textiles', city: 'Surat', industry: 'Textile', score: 85, tier: 'STRONG', isNTC: false },
  { id: 'APP-VIKRAM', name: 'Vikram Auto Parts', city: 'Hyderabad', industry: 'Auto Parts', score: 45, tier: 'WATCH', isNTC: false },
  { id: 'APP-ANITA', name: 'Anita Catering', city: 'Chennai', industry: 'Food', score: 28, tier: 'HIGH_RISK', isNTC: true },
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
            <ArrowUpRight className="h-3.5 w-3.5 text-[#10B981]" />
          ) : trend === 'down' ? (
            <ArrowDownRight className="h-3.5 w-3.5 text-[#F43F5E]" />
          ) : null}
          <span className={trend === 'up' ? 'text-[#10B981] font-semibold' : trend === 'down' ? 'text-[#F43F5E] font-semibold' : 'text-[var(--text-secondary)]'}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  void error;
  const [animatingAgent, setAnimatingAgent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [cov, allScores, allApplicants] = await Promise.all([
          api.get('/v1/coverage-stats').then(r => r.data).catch(() => ({ total_applicants: 0, coverage_improvement_pct: 0 })),
          api.get('/v1/score').then(r => r.data).catch(() => []),
          api.get('/v1/applicants').then(r => r.data).catch(() => []),
        ]);
        setStats(cov);
        setApplicants(allApplicants.slice(0, 5));
        const tierCounts: Record<string, number> = { STRONG: 0, ADEQUATE: 0, WATCH: 0, HIGH_RISK: 0 };
        allScores.forEach((s: any) => { if (tierCounts[s.tier] !== undefined) tierCounts[s.tier]++; });
        setScores(Object.entries(tierCounts).map(([tier, count]) => ({ tier, count })));
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDemoPersonaClick = (id: string) => {
    navigate(`/applicants/${id}?demo=true`);
  };

  const handleLaunchDemo = () => {
    setAnimatingAgent(true);
    setTimeout(() => {
      navigate('/applicants/APP-RAMESH?demo=true');
    }, 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Activity className="h-8 w-8 animate-spin text-[var(--accent)]" />
        <span className="ml-3 text-sm text-[var(--text-secondary)] font-mono uppercase tracking-wider font-semibold">Loading Executive Intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
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
        <KPICard title="Total Applicants" value={stats?.total_applicants || 0} subtitle="Registered MSME profiles" icon={<Users className="h-4 w-4" />} color="#3B82F6" trend="up" trendValue="+12% from last week" />
        <KPICard title="NTC/NTB Coverage" value={`${stats?.coverage_improvement_pct?.toFixed(1) || 0}%`} subtitle={`${stats?.applicants_without_bureau_record_with_usable_score || 0} usable scores`} icon={<FileCheck className="h-4 w-4" />} color="#10B981" trend="up" trendValue="+5.3% improvement" />
        <KPICard title="Flagged for Review" value={(scores.find((s) => s.tier === 'WATCH')?.count || 0) + (scores.find((s) => s.tier === 'HIGH_RISK')?.count || 0)} subtitle="WATCH + HIGH_RISK tiers" icon={<AlertTriangle className="h-4 w-4" />} color="#F59E0B" trend="neutral" trendValue="Stable" />
        <KPICard title="AA Adapter Status" value="Active" subtitle="Finvu sandbox connected" icon={<Activity className="h-4 w-4" />} color="#C9A961" trend="up" trendValue="Online" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="tier" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'var(--text-secondary)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scores.map((d: any) => (
                    <Cell key={d.tier} fill={TIER_COLORS[d.tier] || '#64748b'} />
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
          {DEMO_PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleDemoPersonaClick(p.id)}
              className="text-left rounded-xl border border-[var(--border)] p-4 transition-all hover:border-[var(--text-secondary)] cursor-pointer bg-[var(--surface)] hover:bg-[var(--surface-raised)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-[var(--text-secondary)] font-semibold">{p.id}</span>
                {p.isNTC && <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--text-primary)]">NTC</span>}
              </div>
              <div className="text-sm font-bold text-[var(--text-primary)] mb-0.5">{p.name}</div>
              <div className="text-[11px] text-[var(--text-secondary)] font-sans">{p.industry} • {p.city}</div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5">
                <span className="text-xl font-bold font-mono" style={{ color: TIER_COLORS[p.tier] }}>{p.score}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ color: TIER_COLORS[p.tier], backgroundColor: TIER_COLORS[p.tier] + '15' }}>{p.tier}</span>
              </div>
            </button>
          ))}
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
                <div className="h-2 w-2 rounded-full bg-[#10B981]" />
                <div className="text-sm font-bold text-[var(--text-primary)]">Account Aggregator (AA)</div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">REAL API</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                <div className="text-sm font-bold text-[var(--text-primary)]">OCEN Adapter</div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">SANDBOX</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                <div className="text-sm font-bold text-[var(--text-primary)]">ULI Connector</div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">SANDBOX</span>
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
