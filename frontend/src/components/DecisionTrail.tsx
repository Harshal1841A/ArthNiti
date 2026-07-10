import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface DecisionTrailProps {
  stages: { stage: string; status: string; detail: string; timestamp?: string }[];
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  complete: <CheckCircle2 className="h-4 w-4 text-[var(--accent-emerald)]" />,
  pending: <Clock className="h-4 w-4 text-[var(--accent-amber)]" />,
  error: <AlertTriangle className="h-4 w-4 text-[var(--accent-rose)]" />,
};

export default function DecisionTrail({ stages }: DecisionTrailProps) {
  return (
    <div className="glass-card p-6 border border-[var(--border)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-5">
        <h3 className="text-base font-serif font-bold text-[var(--text-primary)] tracking-tight">Audit & Decision Lineage Trail</h3>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-secondary)]">Immutable Telemetry Log</span>
      </div>

      <div className="flex items-start gap-0 overflow-x-auto pb-3">
        {stages.map((stage, index) => {
          const isComplete = stage.status === 'complete';
          const isPending = stage.status === 'pending';

          return (
            <div key={stage.stage} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center gap-2.5 min-w-[150px]">
                <motion.div
                  className={`relative flex items-center justify-center w-10 h-10 rounded-xl border ${
                    isComplete
                      ? 'bg-[var(--accent-emerald)]/15 border-[var(--accent-emerald)]/40'
                      : isPending
                      ? 'bg-[var(--accent-amber)]/15 border-[var(--accent-amber)]/40'
                      : 'bg-[var(--border-subtle)] border-[var(--border)]'
                  }`}
                  initial={isComplete ? { scale: 0 } : { scale: 1 }}
                  animate={isComplete ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.15 }}
                >
                  {isComplete ? STAGE_ICONS.complete : isPending ? STAGE_ICONS.pending : STAGE_ICONS.error}
                  {isComplete && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border border-[var(--accent-emerald)]/40"
                      animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
                <div className="text-center">
                  <div className={`text-xs font-mono font-bold uppercase tracking-wider ${isComplete ? 'text-[var(--accent-emerald)]' : isPending ? 'text-[var(--accent-amber)]' : 'text-[var(--text-muted)]'}`}>
                    {stage.stage.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-1 max-w-[130px] leading-snug">{stage.detail}</div>
                  {stage.timestamp && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">{stage.timestamp.split('T')[1]?.split('+')[0]}</div>
                  )}
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className="w-10 h-0.5 bg-[var(--border)] mt-5 mx-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
