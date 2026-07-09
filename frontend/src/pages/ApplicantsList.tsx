import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowUpRight,
  Loader2,
  Users,
} from 'lucide-react';
import api from '@/lib/api';

interface Applicant {
  id: string;
  business_name: string;
  has_bureau_record: boolean;
  is_synthetic: boolean;
  preferred_language: string;
  created_at: string;
}

export default function ApplicantsList() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'ntb' | 'synthetic'>('all');

  useEffect(() => {
    api.get('/v1/applicants')
      .then(r => setApplicants(Array.isArray(r.data) ? r.data : []))
      .catch(e => {
        setError(e.response?.data?.detail || 'Failed to load applicants');
        // Fallback mock portfolio when offline/demo
        setApplicants([
          { id: "MSME-4021", business_name: "Arjun Textiles & Co", has_bureau_record: true, is_synthetic: false, preferred_language: "EN", created_at: new Date().toISOString() },
          { id: "MSME-4089", business_name: "Kaveri Agro Exports", has_bureau_record: false, is_synthetic: false, preferred_language: "HI", created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: "MSME-4102", business_name: "Vindhya Logistics Pvt Ltd", has_bureau_record: true, is_synthetic: true, preferred_language: "EN", created_at: new Date(Date.now() - 172800000).toISOString() }
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = (applicants || []).filter(a => {
    const matchesSearch = (a?.business_name || '').toLowerCase().includes(search.toLowerCase()) || (a?.id || '').toLowerCase().includes(search.toLowerCase());
    if (filter === 'ntb') return matchesSearch && !a?.has_bureau_record;
    if (filter === 'synthetic') return matchesSearch && a?.is_synthetic;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        <span className="ml-3 text-sm text-[var(--text-secondary)] font-mono uppercase tracking-wider font-semibold">Loading Portfolio Dossiers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-6 text-sm text-[#F43F5E] font-mono">
        <div className="font-bold mb-1 uppercase tracking-wider">System Exception</div>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <span className="eyebrow">PORTFOLIO // REGISTRY</span>
          <h1 className="text-3xl font-serif text-[var(--text-primary)]">MSME <span className="italic">Profiles</span>.</h1>
        </div>
        <Link to="/applicants/new">
          <button className="btn-gold">
            <Plus className="h-4 w-4" /> New Application
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 border border-[var(--border)]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search by business identity or dossier ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-all font-sans"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`pill-tab ${filter === 'all' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
            >
              ALL dossiers ({applicants.length})
            </button>
            <button
              onClick={() => setFilter('ntb')}
              className={`pill-tab ${filter === 'ntb' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
            >
              NTC/NTB ({applicants.filter(a => !a.has_bureau_record).length})
            </button>
            <button
              onClick={() => setFilter('synthetic')}
              className={`pill-tab ${filter === 'synthetic' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
            >
              SYNTHETIC ({applicants.filter(a => a.is_synthetic).length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                <th className="py-4 px-6">Business Entity</th>
                <th className="py-4 px-6">Dossier ID</th>
                <th className="py-4 px-6">Bureau Footprint</th>
                <th className="py-4 px-6">Origin</th>
                <th className="py-4 px-6">Language</th>
                <th className="py-4 px-6">Registered</th>
                <th className="w-16 py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(a => (
                <tr key={a.id} className="group cursor-pointer hover:bg-[var(--surface-raised)] transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-serif font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{a.business_name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-mono text-xs text-[var(--text-secondary)] bg-[var(--surface)] px-2 py-1 rounded border border-[var(--border)]">{a.id}</span>
                  </td>
                  <td className="py-4 px-6">
                    {a.has_bureau_record ? (
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30">BUREAU FOUND</span>
                    ) : (
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">THIN FILE (NTC)</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {a.is_synthetic ? (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-secondary)]">SYNTHETIC</span>
                    ) : (
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]">REAL BORROWER</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-mono uppercase font-semibold text-[var(--text-secondary)]">{a.preferred_language}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-mono text-[var(--text-secondary)]">{a?.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link to={`/applicants/${a.id}`}>
                      <button className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:border-[var(--text-primary)] transition-all bg-[var(--surface)]">
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] font-mono">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-base font-bold">No matching MSME profiles</p>
            <p className="text-xs mt-1">Try adjusting your search criteria or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
