import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Zap } from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  STRONG: '#10B981',
  ADEQUATE: '#3B82F6',
  WATCH: '#F59E0B',
  HIGH_RISK: '#F43F5E',
};

interface FinancialHealthCardProps {
  score: number;
  tier: string;
  businessName: string;
  city: string;
  industry: string;
  isNTC?: boolean;
  modelVersion?: string;
  inferenceMs?: number;
}

export default function FinancialHealthCard({
  score, tier, businessName, city, industry, isNTC, modelVersion, inferenceMs,
}: FinancialHealthCardProps) {
  const color = TIER_COLORS[tier] || '#64748B';

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-xl transition-all"
      style={{ aspectRatio: '1.586' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Architectural grid overlay for Atelier Vibe */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />

      {/* Top row */}
      <div className="flex items-center justify-between relative z-10 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5" style={{ color }} />
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--text-secondary)]">Stitch Atelier • Financial Health Dossier</span>
        </div>
        <div className="flex items-center gap-2">
          {isNTC && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)]">
              NTC/NTB
            </span>
          )}
          <span
            className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
          >
            {tier}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="mt-6 relative z-10 flex items-baseline gap-2">
        <div className="text-6xl font-bold font-mono tracking-tight" style={{ color }}>
          {score}
        </div>
        <div className="text-sm font-mono text-[var(--text-secondary)] uppercase">/ 100 PTS</div>
      </div>

      {/* Business info */}
      <div className="mt-6 relative z-10">
        <div className="text-2xl font-serif font-bold text-[var(--text-primary)] tracking-tight">{businessName}</div>
        <div className="text-xs text-[var(--text-secondary)] font-mono mt-1 uppercase tracking-wider">{industry} • {city}</div>
      </div>

      {/* Bottom row */}
      <div className="absolute bottom-5 left-8 right-8 flex items-center justify-between z-10 border-t border-[var(--border-subtle)] pt-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" style={{ color }} />
          <span className="text-[11px] font-mono text-[var(--text-secondary)]">SHAP Fact-Check Verified</span>
        </div>
        <div className="flex items-center gap-3">
          {inferenceMs !== undefined && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest flex items-center gap-1">
              <Zap className="h-3 w-3" /> {inferenceMs}ms
            </span>
          )}
          <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">{modelVersion || 'xgb_model_v1.4'}</span>
        </div>
      </div>
    </motion.div>
  );
}
