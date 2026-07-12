import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, BrainCircuit, Zap, Play, Cpu, Sparkles, CheckCircle2,
} from 'lucide-react';
import MultiAgentViz from '@/components/MultiAgentViz';
import { tierColor } from '@/lib/tierColors';

const PERSONAS = [
  { id: 'APP-RAMESH', name: 'Ramesh', business: 'Ramesh General Store', city: 'Indore', industry: 'Retail', tier: 'ADEQUATE', score: 72, desc: 'Stable inflows, good GST compliance, low bounce count' },
  { id: 'APP-PRIYA', name: 'Priya', business: 'Priya Textiles', city: 'Surat', industry: 'Manufacturing', tier: 'STRONG', score: 85, desc: 'Exceptional GST filing, zero bounces, growing payroll' },
  { id: 'APP-MOHAMMED', name: 'Mohammed', business: 'Mohammed Enterprises', city: 'Hyderabad', industry: 'Trading', tier: 'WATCH', score: 45, desc: 'High income volatility, irregular GST, stressed cash flow' },
  { id: 'APP-LAKSHMI', name: 'Lakshmi', business: 'Lakshmi Dairy Products', city: 'Chennai', industry: 'Food Services', tier: 'HIGH_RISK', score: 28, desc: 'Very low balance, high volatility, critical EMI-to-income ratio' },
  { id: 'APP-SURESH', name: 'Suresh', business: 'Suresh Electronics', city: 'Delhi', industry: 'Electronics', tier: 'ADEQUATE', score: 61, desc: 'Solid business, digital payments, moderate seasonal volatility' },
];

function playDemoLaunchAudio(score: number) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const freq = score >= 75 ? 659.25 : score >= 50 ? 523.25 : 392.00;
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.start(now);
    osc.stop(now + 0.29);
  } catch {}
}

export default function DemoModePage() {
  const { currentPersona } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [launchingPersona, setLaunchingPersona] = useState<(typeof PERSONAS)[0] | null>(null);
  const navigate = useNavigate();

  if (currentPersona === 'applicant') {
    return <Navigate to="/applicants/APP-SURESH/health-card?demo=true" replace />;
  }

  const handleLaunchPersona = (persona: (typeof PERSONAS)[0]) => {
    setSelected(persona.id);
    setLaunchingPersona(persona);
    playDemoLaunchAudio(persona.score);

    setTimeout(() => {
      navigate(`/applicants/${persona.id}?demo=true`);
    }, 850);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <AnimatePresence>
        {launchingPersona && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md font-sans"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/95 p-8 shadow-2xl max-w-md w-full mx-4"
              style={{
                boxShadow: `0 0 45px ${tierColor(launchingPersona.tier)}40`,
                borderColor: tierColor(launchingPersona.tier),
              }}
            >
              <motion.div
                initial={{ y: '-100vh' }}
                animate={{ y: '100vh' }}
                transition={{ duration: 0.8, ease: 'easeInOut', repeat: 1 }}
                className="absolute inset-x-0 h-1.5 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent, ${tierColor(launchingPersona.tier)}, transparent)`,
                }}
              />

              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    LOADING MSME PROFILE
                  </span>
                </div>
                <Badge
                  variant={launchingPersona.tier.toLowerCase().replace('_', '-') as any}
                  style={{ borderColor: tierColor(launchingPersona.tier), fontWeight: 'bold' }}
                >
                  {launchingPersona.tier}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-xl font-black text-white"
                  style={{
                    backgroundColor: `${tierColor(launchingPersona.tier)}20`,
                    borderColor: tierColor(launchingPersona.tier),
                  }}
                >
                  {launchingPersona.name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{launchingPersona.business}</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {launchingPersona.city} • {launchingPersona.industry}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Underwriting Score</div>
                  <div className="text-2xl font-black font-mono mt-0.5" style={{ color: tierColor(launchingPersona.tier) }}>
                    {launchingPersona.score} / 100
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account Aggregator</div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> LINKED & ACTIVE
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-slate-300" />
                  Running real-time counterfactual model...
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-[var(--text-primary)]">
            <Zap className="h-6 w-6 text-[var(--accent)]" />
            Demo Mode
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Pre-loaded personas for hackathon judging. Click any card to load.</p>
        </div>
        <Link to="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <BrainCircuit className="h-4 w-4 text-[var(--accent)]" />
            Multi-Agent System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MultiAgentViz activeStage="decision" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PERSONAS.map((persona, index) => {
          const isSelected = selected === persona.id;
          return (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={`
                  relative overflow-hidden rounded-xl border p-5 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between
                  ${isSelected
                    ? 'card-surface-elevated border-tier-strong shadow-lg ring-1 ring-tier-strong/30'
                    : 'card-surface-base hover:border-[var(--text-secondary)]'
                  }
                `}
                onClick={() => handleLaunchPersona(persona)}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-[var(--bg-card-hover)] border border-[var(--border)] flex items-center justify-center text-lg font-bold text-[var(--text-primary)] shadow-sm">
                      {persona.name[0]}
                    </div>
                    <Badge
                      variant={persona.tier.toLowerCase().replace('_', '-') as any}
                      style={{ borderColor: `color-mix(in srgb, ${tierColor(persona.tier)} 40%, transparent)`, fontWeight: 'bold' }}
                    >
                      {persona.tier}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-[var(--text-primary)] mb-1 font-sans">{persona.business}</div>
                  <div className="text-xs text-[var(--text-secondary)] font-semibold mb-3">{persona.city} • {persona.industry}</div>
                  <div className="flex items-center justify-between mb-3 border-y border-[var(--border)] py-2">
                    <span className="text-xs text-[var(--text-secondary)] font-medium">Underwriting Score</span>
                    <span className="text-xl font-bold font-mono leading-none" style={{ color: tierColor(persona.tier) }}>
                      {persona.score}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">{persona.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)] hover:underline">
                  <Play className="h-3.5 w-3.5 fill-[var(--accent)]" /> Click to load full profile
                </div>
              </div>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/applicants/new">
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-5 h-full flex flex-col items-center justify-center text-center hover:bg-[var(--bg-card-hover)] hover:border-[var(--text-secondary)] transition-all cursor-pointer">
              <div className="h-10 w-10 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] mb-3 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-sm font-bold text-[var(--text-primary)]">Create Custom</div>
              <div className="text-xs text-[var(--text-secondary)] font-medium mt-1">Build your own applicant profile</div>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
