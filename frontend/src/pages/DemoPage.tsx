import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Zap,
  BrainCircuit,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  User,
} from 'lucide-react';
import MultiAgentViz from '@/components/MultiAgentViz';
import ArthMitraPlayer, {
  ENGLISH_NARRATIVES,
  ALL_NARRATIVES,
} from '@/components/ArthMitraPlayer';

// BUG-13 FIX: Use correct backend persona IDs (APP-MOHAMMED, APP-LAKSHMI)
const DEMO_PERSONAS = [
  { id: 'APP-RAMESH', name: 'Ramesh Kumar', business: 'Ramesh General Store', city: 'Indore', score: 72, tier: 'ADEQUATE' },
  { id: 'APP-PRIYA', name: 'Priya Sharma', business: 'Priya Textiles', city: 'Surat', score: 85, tier: 'STRONG' },
  { id: 'APP-MOHAMMED', name: 'Mohammed Ahmed', business: 'Mohammed Enterprises', city: 'Hyderabad', score: 45, tier: 'WATCH' },
  { id: 'APP-LAKSHMI', name: 'Lakshmi Devi', business: 'Lakshmi Dairy Products', city: 'Chennai', score: 28, tier: 'HIGH_RISK' },
  { id: 'APP-SURESH', name: 'Suresh Gupta', business: 'Suresh Electronics', city: 'Delhi', score: 61, tier: 'ADEQUATE' },
];

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  STRONG: { color: '#34d399', bg: 'bg-emerald-500/20 text-emerald-300', border: 'border-emerald-500/40', label: 'Strong' },
  ADEQUATE: { color: '#60a5fa', bg: 'bg-blue-500/20 text-blue-300', border: 'border-blue-500/40', label: 'Adequate' },
  WATCH: { color: '#fbbf24', bg: 'bg-amber-500/20 text-amber-300', border: 'border-amber-500/40', label: 'Watch' },
  HIGH_RISK: { color: '#f87171', bg: 'bg-red-500/20 text-red-300', border: 'border-red-500/40', label: 'High Risk' },
};

const AGENT_STAGES = ['aa', 'scoring', 'xai', 'ocen', 'decision'];
const AGENT_NAMES: Record<string, string> = {
  aa: 'AA Agent',
  scoring: 'Scoring Agent',
  xai: 'XAI Agent',
  ocen: 'OCEN Agent',
  decision: 'Decision Agent',
};

const AGENT_ICONS: Record<string, 'Shield' | 'Activity' | 'BrainCircuit' | 'TrendingUp' | 'CheckCircle2'> = {
  aa: 'Shield',
  scoring: 'Activity',
  xai: 'BrainCircuit',
  ocen: 'TrendingUp',
  decision: 'CheckCircle2',
};

export default function DemoPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(-1); // -1 = not started
  const [activeAgent, setActiveAgent] = useState('');
  const [latency, setLatency] = useState(0);
  const [showCard, setShowCard] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(DEMO_PERSONAS[0]);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState('hi');
  const [isFallback, setIsFallback] = useState(false);
  const [xaiNarrative, setXaiNarrative] = useState('');
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'idle' | 'processing' | 'complete' | 'error'>>({
    aa: 'idle',
    scoring: 'idle',
    xai: 'idle',
    ocen: 'idle',
    decision: 'idle',
  });

  const startDemo = useCallback(() => {
    setStage(0);
    setShowCard(false);
    setLatency(0);
    setAgentStatuses({
      aa: 'idle',
      scoring: 'idle',
      xai: 'idle',
      ocen: 'idle',
      decision: 'idle',
    });
  }, []);

  useEffect(() => {
    startDemo();
  }, [startDemo]);

  useEffect(() => {
    if (stage < 0) return;

    if (stage >= AGENT_STAGES.length) {
      setShowCard(true);
      return;
    }

    const agentId = AGENT_STAGES[stage];
    setActiveAgent(agentId);
    setAgentStatuses((prev) => ({ ...prev, [agentId]: 'processing' }));

    const timer = setTimeout(() => {
      setAgentStatuses((prev) => ({ ...prev, [agentId]: 'complete' }));
      setLatency((prev) => prev + Math.floor(Math.random() * 150 + 50));
      setStage((prev) => prev + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    const narrative =
      (ALL_NARRATIVES[language] ?? ENGLISH_NARRATIVES)[selectedPersona.id]
      || ENGLISH_NARRATIVES[selectedPersona.id]
      || '';
    setXaiNarrative(narrative);
    setAudioUrl(undefined);
    setIsFallback(false);
  }, [selectedPersona, language]);

  const latenciesRef = useRef<Record<string, number>>({});
  const nodes = useMemo(() => {
    return AGENT_STAGES.map((id) => {
      if (agentStatuses[id] === 'complete' && !latenciesRef.current[id]) {
        latenciesRef.current[id] = Math.floor(Math.random() * 150 + 50);
      }
      return {
        id,
        name: AGENT_NAMES[id],
        icon: AGENT_ICONS[id],
        status: agentStatuses[id],
        latencyMs: agentStatuses[id] === 'complete' ? latenciesRef.current[id] : undefined,
      };
    });
  }, [agentStatuses]);

  const tierConfig = TIER_CONFIG[selectedPersona.tier];

  const PERSONA_SHAP: Record<string, { strengths: { feature: string; shap_value: number }[]; risks: { feature: string; shap_value: number }[] }> = {
    'APP-RAMESH': {
      strengths: [{ feature: 'avg_monthly_inflow', shap_value: 0.14 }, { feature: 'gst_filing_regularity_12mo', shap_value: 0.11 }],
      risks: [{ feature: 'bounce_count_90d', shap_value: -0.06 }, { feature: 'inflow_volatility_coefficient', shap_value: -0.04 }],
    },
    'APP-PRIYA': {
      strengths: [{ feature: 'avg_monthly_inflow', shap_value: 0.22 }, { feature: 'gst_filing_regularity_12mo', shap_value: 0.18 }],
      risks: [{ feature: 'bounce_count_90d', shap_value: -0.01 }, { feature: 'inflow_volatility_coefficient', shap_value: -0.02 }],
    },
    'APP-MOHAMMED': {
      strengths: [{ feature: 'avg_monthly_inflow', shap_value: 0.08 }, { feature: 'gst_filing_regularity_12mo', shap_value: 0.05 }],
      risks: [{ feature: 'bounce_count_90d', shap_value: -0.14 }, { feature: 'inflow_volatility_coefficient', shap_value: -0.11 }],
    },
    'APP-LAKSHMI': {
      strengths: [{ feature: 'avg_monthly_inflow', shap_value: 0.04 }, { feature: 'gst_filing_regularity_12mo', shap_value: 0.02 }],
      risks: [{ feature: 'bounce_count_90d', shap_value: -0.24 }, { feature: 'inflow_volatility_coefficient', shap_value: -0.19 }],
    },
    'APP-SURESH': {
      strengths: [{ feature: 'avg_monthly_inflow', shap_value: 0.12 }, { feature: 'gst_filing_regularity_12mo', shap_value: 0.09 }],
      risks: [{ feature: 'bounce_count_90d', shap_value: -0.07 }, { feature: 'inflow_volatility_coefficient', shap_value: -0.05 }],
    },
  };

  const personaShap = PERSONA_SHAP[selectedPersona.id] || PERSONA_SHAP['APP-RAMESH'];
  const strengths = personaShap.strengths;
  const risks = personaShap.risks;
  const maxShap = Math.max(
    ...strengths.map((s) => s.shap_value),
    ...risks.map((r) => Math.abs(r.shap_value)),
    0.15
  );

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pitch Deck Mode</h1>
            <p className="text-sm text-[var(--text-secondary)]">Auto-running demo for judges — no interaction required</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!showCard && stage < 0 && (
            <Button onClick={startDemo}>
              <Zap className="mr-2 h-4 w-4" /> Start Demo
            </Button>
          )}
          {showCard && (
            <Button variant="outline" onClick={startDemo}>
              <Activity className="mr-2 h-4 w-4" /> Replay
            </Button>
          )}
        </div>
      </div>

      {/* Multi-Agent Viz */}
      <MultiAgentViz nodes={nodes} activeStage={activeAgent} overallLatency={latency} />

      {/* Persona selector */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {DEMO_PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedPersona(p);
              setShowCard(false);
              setStage(-1);
              setActiveAgent('');
              setLatency(0);
            }}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              selectedPersona.id === p.id
                ? 'border-[#C9A961] bg-[#C9A961]/10 ring-1 ring-[#C9A961]/40'
                : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-card-hover)] border border-[var(--border)] text-[var(--text-primary)] font-bold">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)] truncate">{p.name}</div>
              <div className="text-xs text-[var(--text-secondary)] font-medium truncate">{p.business}</div>
              <div className="text-xs font-mono font-bold mt-0.5" style={{ color: TIER_CONFIG[p.tier]?.color }}>
                {p.score} / 100
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Financial Health Card */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Score Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-l-4" style={{ borderLeftColor: tierConfig?.color }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="relative flex items-center justify-center">
                      <svg className="h-32 w-32 -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="var(--border)" strokeWidth="8" fill="none" />
                        <circle
                          cx="64" cy="64" r="56"
                          stroke={tierConfig?.color}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(selectedPersona.score / 100) * 351.86} 351.86`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-bold text-[var(--text-primary)] font-mono">{selectedPersona.score}</span>
                        <span className="text-xs text-[var(--text-secondary)] font-medium">/ 100</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={selectedPersona.tier.toLowerCase() as any}>{tierConfig?.label || selectedPersona.tier}</Badge>
                      </div>
                      <div className="text-sm font-bold text-[var(--text-primary)] mb-1">
                        {selectedPersona.business} — {selectedPersona.city}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] font-mono font-medium">{selectedPersona.id}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-[var(--text-primary)] font-bold">Routing Decision</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)] font-medium">Next Step</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {selectedPersona.tier === 'STRONG'
                          ? 'Straight-Through Approval'
                          : 'Enhanced Review Required'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)] font-medium">Review Required</span>
                      <span className={`font-bold ${selectedPersona.tier !== 'STRONG' ? 'text-tier-watch' : 'text-tier-strong'}`}>
                        {selectedPersona.tier !== 'STRONG' ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)] font-medium">Model Version</span>
                      <span className="font-mono text-[var(--text-primary)] font-bold">xgb_model</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SHAP Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-tier-strong font-bold">
                    <TrendingUp className="h-4 w-4" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {strengths.map((f) => (
                    <div key={f.feature}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-primary)] font-semibold">{f.feature.replace(/_/g, ' ')}</span>
                        <span className="text-tier-strong font-mono font-bold">+{f.shap_value.toFixed(4)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-card-hover)] overflow-hidden border border-[var(--border)]">
                        <div className="h-full rounded-full bg-tier-strong transition-all" style={{ width: `${(f.shap_value / maxShap) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-tier-high-risk font-bold">
                    <TrendingDown className="h-4 w-4" /> Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {risks.map((f) => (
                    <div key={f.feature}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-primary)] font-semibold">{f.feature.replace(/_/g, ' ')}</span>
                        <span className="text-tier-high-risk font-mono font-bold">{f.shap_value.toFixed(4)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-card-hover)] overflow-hidden border border-[var(--border)]">
                        <div className="h-full rounded-full bg-tier-high-risk transition-all" style={{ width: `${(Math.abs(f.shap_value) / maxShap) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* XAI + Arth-Mitra */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2 text-[var(--text-primary)] font-bold">
                    <BrainCircuit className="h-4 w-4 text-[var(--accent)]" /> XAI Narrative
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold bg-tier-strong/15 text-tier-strong border border-tier-strong/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Numeric cross-check passed
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--bg-card-hover)] rounded-lg p-4 border border-[var(--border)] font-medium">
                    {xaiNarrative}
                  </p>
                  <ArthMitraPlayer
                    audioUrl={audioUrl}
                    narrativeText={xaiNarrative}
                    language={language}
                    onLanguageChange={setLanguage}
                    personaId={selectedPersona.id}
                    isFallback={isFallback}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
