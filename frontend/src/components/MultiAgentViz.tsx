import { motion } from 'framer-motion';
import { Shield, Activity, BrainCircuit, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AgentNode {
  id: string;
  name: string;
  icon: React.ReactNode | string;
  status?: 'idle' | 'processing' | 'complete' | 'error';
  latencyMs?: number;
}

const DEFAULT_NODES: AgentNode[] = [
  { id: 'aa', name: 'AA Telemetry', icon: <Shield className="h-4 w-4" /> },
  { id: 'scoring', name: 'Underwriting AI', icon: <Activity className="h-4 w-4" /> },
  { id: 'xai', name: 'SHAP Auditor', icon: <BrainCircuit className="h-4 w-4" /> },
  { id: 'ocen', name: 'OCEN Protocol', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'decision', name: 'Credit Decision', icon: <CheckCircle2 className="h-4 w-4" /> },
];

function renderIcon(icon: React.ReactNode | string) {
  if (typeof icon !== 'string') return icon;
  switch (icon) {
    case 'Shield': return <Shield className="h-4 w-4" />;
    case 'Activity': return <Activity className="h-4 w-4" />;
    case 'BrainCircuit': return <BrainCircuit className="h-4 w-4" />;
    case 'TrendingUp': return <TrendingUp className="h-4 w-4" />;
    case 'CheckCircle2': return <CheckCircle2 className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
}

interface MultiAgentVizProps {
  nodes?: AgentNode[];
  activeStage?: string;
  overallLatency?: number;
  isAnimating?: boolean;
}

export default function MultiAgentViz({ nodes, activeStage, overallLatency, isAnimating = false }: MultiAgentVizProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [latency, setLatency] = useState(0);

  const displayNodes = (nodes && nodes.length > 0) ? nodes : DEFAULT_NODES;

  useEffect(() => {
    if (isAnimating) {
      let i = 0;
      const interval = setInterval(() => {
        setActiveIndex(i);
        setLatency((i + 1) * 12);
        i++;
        if (i >= displayNodes.length) {
          clearInterval(interval);
        }
      }, 800);
      return () => clearInterval(interval);
    } else if (activeStage) {
      const idx = displayNodes.findIndex((n) => n.id === activeStage);
      setActiveIndex(idx);
    }
  }, [isAnimating, activeStage, displayNodes]);

  const displayedLatency = overallLatency !== undefined && overallLatency > 0 ? overallLatency : (latency || 48);

  return (
    <div className="glass-card p-6 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-6 border-b border-[var(--border)] pb-3">
        <div>
          <span className="eyebrow">PIPELINE // TELEMETRY & DECISIONING</span>
          <h3 className="text-lg font-serif text-[var(--text-primary)]">Autonomous Multi-Agent <span className="italic">Pipeline</span>.</h3>
        </div>
        <div className="text-right">
          <span className="stat-label">EXECUTION LATENCY</span>
          <span className="font-mono text-sm font-bold text-[var(--accent)]">{displayedLatency}MS</span>
        </div>
      </div>

      <div className="flex items-center justify-between relative px-2">
        {/* Connection line - true hairline */}
        <div className="absolute top-6 left-6 right-6 h-[1px] bg-[var(--border)] -translate-y-1/2" />

        {displayNodes.map((node, index) => {
          const isCurrent = node.status ? node.status === 'processing' : (index === activeIndex);
          const isComplete = node.status ? node.status === 'complete' : (index < activeIndex);
          const isActive = isCurrent || isComplete;

          const bgColor = isCurrent ? 'rgba(201, 169, 97, 0.12)' : isActive ? 'var(--bg-card-hover)' : 'var(--bg-card)';

          return (
            <div key={node.id} className="relative z-10 flex flex-col items-center gap-2.5">
              <motion.div
                className="relative flex items-center justify-center w-12 h-12 rounded-xl border transition-all duration-300 shadow-sm"
                style={{
                  borderColor: isCurrent ? '#C9A961' : isActive ? 'var(--accent, #C9A961)' : 'var(--border)',
                  backgroundColor: bgColor,
                  boxShadow: isCurrent ? '0 0 20px rgba(201, 169, 97, 0.25)' : isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                }}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0, ease: 'easeInOut' }}
              >
                <span style={{ color: isCurrent ? '#C9A961' : isActive ? 'var(--accent, #C9A961)' : 'var(--text-muted)' }}>{renderIcon(node.icon)}</span>
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border border-[#C9A961]"
                    animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </motion.div>

              {/* Data particle */}
              {isCurrent && index < displayNodes.length - 1 && (
                <motion.div
                  className="absolute top-6 left-12 w-1.5 h-1.5 rounded-full z-20 bg-[#C9A961]"
                  style={{ boxShadow: '0 0 8px rgba(201, 169, 97, 0.8)' }}
                  animate={{ x: [0, 48] }}
                  transition={{ duration: 0.8, ease: 'easeInOut', repeat: Infinity }}
                />
              )}

              <div className="text-center">
                <span className={`block font-sans text-xs tracking-tight ${isActive ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)] font-medium'}`}>
                  {node.name}
                </span>
                <span className={`block font-mono text-[11px] mt-0.5 tracking-[0.05em] uppercase ${isCurrent ? 'text-[var(--accent)] font-bold' : isComplete ? 'text-tier-strong font-bold' : 'text-[var(--text-muted)] font-medium'}`}>
                  {isCurrent ? 'ACTIVE...' : isComplete ? 'VERIFIED' : 'IDLE'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
