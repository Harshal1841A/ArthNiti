import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, BrainCircuit, Zap, Play,
} from 'lucide-react';
import MultiAgentViz from '@/components/MultiAgentViz';
import { tierColor } from '@/lib/tierColors';

// BUG-13 FIX: All IDs must match backend demo_personas.py seeds.
// demo-ramesh / demo-priya / demo-suresh are not real IDs — they would 404.
const PERSONAS = [
  { id: 'APP-RAMESH', name: 'Ramesh', business: 'Ramesh General Store', city: 'Indore', industry: 'Retail', tier: 'ADEQUATE', score: 72, desc: 'Stable inflows, good GST compliance, low bounce count' },
  { id: 'APP-PRIYA', name: 'Priya', business: 'Priya Textiles', city: 'Surat', industry: 'Manufacturing', tier: 'STRONG', score: 85, desc: 'Exceptional GST filing, zero bounces, growing payroll' },
  { id: 'APP-MOHAMMED', name: 'Mohammed', business: 'Mohammed Enterprises', city: 'Hyderabad', industry: 'Trading', tier: 'WATCH', score: 45, desc: 'High income volatility, irregular GST, stressed cash flow' },
  { id: 'APP-LAKSHMI', name: 'Lakshmi', business: 'Lakshmi Dairy Products', city: 'Chennai', industry: 'Food Services', tier: 'HIGH_RISK', score: 28, desc: 'Very low balance, high volatility, critical EMI-to-income ratio' },
  { id: 'APP-SURESH', name: 'Suresh', business: 'Suresh Electronics', city: 'Delhi', industry: 'Electronics', tier: 'ADEQUATE', score: 61, desc: 'Solid business, digital payments, moderate seasonal volatility' },
];


export default function DemoModePage() {
  const { currentPersona } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);

  if (currentPersona === 'applicant') {
    return <Navigate to="/applicants/APP-SURESH/health-card?demo=true" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
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
              <Link to={`/applicants/${persona.id}?demo=true`}>
                <div
                  className={`
                    relative overflow-hidden rounded-xl border p-5 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between
                    ${isSelected
                      ? 'card-surface-elevated border-tier-strong shadow-lg ring-1 ring-tier-strong/30'
                      : 'card-surface-base hover:border-[var(--text-secondary)]'
                    }
                  `}
                  onClick={() => setSelected(persona.id)}
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
              </Link>
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
