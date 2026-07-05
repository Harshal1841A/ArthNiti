import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

export default function AdapterStatus() {
  const [adapters, setAdapters] = useState<any[]>([]);

  useEffect(() => {
    api.get('/v1/adapters/status').then(r => setAdapters(r.data.adapters));
  }, []);

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    real: { icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-[#10B981]', bg: 'bg-[#10B981]/10 border border-[#10B981]/20' },
    stub: { icon: <AlertTriangle className="h-5 w-5" />, color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10 border border-[#F59E0B]/20' },
    unconfirmed: { icon: <HelpCircle className="h-5 w-5" />, color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--surface)] border border-[var(--border)]' },
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex items-center gap-4 border-b border-[var(--border)] pb-6">
        <Link to="/dashboard">
          <button className="h-10 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-raised)] transition-all">
            <ArrowLeft className="h-4 w-4 text-[var(--text-primary)]" />
          </button>
        </Link>
        <div>
          <span className="eyebrow">SYSTEM // TOPOLOGY</span>
          <h1 className="text-3xl font-serif text-[var(--text-primary)]">System <span className="italic">Adapters</span>.</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {adapters.map((a: any) => {
          const cfg = statusConfig[a.state] || statusConfig.unconfirmed;
          return (
            <div key={a.name} className="glass-card p-6 border border-[var(--border)] transition-all hover:border-[var(--text-secondary)]">
              <div className="flex items-start gap-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="text-lg font-serif font-bold text-[var(--text-primary)] tracking-tight">{a.name}</div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider bg-[var(--border)] text-[var(--text-primary)] border-[var(--border)]">
                      {a.state}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans">{a.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card border border-[var(--border)]">
        <div className="p-6 border-b border-[var(--border)] bg-[var(--surface)]">
          <h3 className="text-lg font-serif font-bold text-[var(--text-primary)] tracking-tight">Status Legend</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <div className="font-mono font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">REAL API</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Live sandbox or production API integration verified</div>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <div className="font-mono font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">SPEC-COMPLIANT</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Protocol shape fully modeled, sandbox stub ready</div>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="font-mono font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">UNCONFIRMED</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Verify FI-type or API availability before deployment</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
