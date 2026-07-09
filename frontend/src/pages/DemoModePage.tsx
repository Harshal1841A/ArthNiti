import { useState } from 'react';
import { Link } from 'react-router-dom';
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

// BUG-13 FIX: All IDs must match backend demo_personas.py seeds.
// demo-ramesh / demo-priya / demo-suresh are not real IDs — they would 404.
const PERSONAS = [
  { id: 'APP-RAMESH', name: 'Ramesh', business: 'Ramesh General Store', city: 'Indore', industry: 'Retail', tier: 'ADEQUATE', score: 72, desc: 'Stable inflows, good GST compliance, low bounce count' },
  { id: 'APP-PRIYA', name: 'Priya', business: 'Priya Textiles', city: 'Surat', industry: 'Manufacturing', tier: 'STRONG', score: 85, desc: 'Exceptional GST filing, zero bounces, growing payroll' },
  { id: 'APP-MOHAMMED', name: 'Mohammed', business: 'Mohammed Enterprises', city: 'Hyderabad', industry: 'Trading', tier: 'WATCH', score: 45, desc: 'High income volatility, irregular GST, stressed cash flow' },
  { id: 'APP-LAKSHMI', name: 'Lakshmi', business: 'Lakshmi Dairy Products', city: 'Chennai', industry: 'Food Services', tier: 'HIGH_RISK', score: 28, desc: 'Very low balance, high volatility, critical EMI-to-income ratio' },
  { id: 'APP-SURESH', name: 'Suresh', business: 'Suresh Electronics', city: 'Delhi', industry: 'Electronics', tier: 'ADEQUATE', score: 61, desc: 'Solid business, digital payments, moderate seasonal volatility' },
];

const TIER_COLORS: Record<string, string> = {
  STRONG: '#10B981',
  ADEQUATE: '#3B82F6',
  WATCH: '#F59E0B',
  HIGH_RISK: '#F43F5E',
};

export default function DemoModePage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-400" />
            Demo Mode
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pre-loaded personas for hackathon judging. Click any card to load.</p>
        </div>
        <Link to="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-emerald-400" />
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
                    relative overflow-hidden rounded-xl border p-5 transition-all duration-300 cursor-pointer h-full
                    ${isSelected
                      ? 'border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                      : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60 hover:border-slate-600'
                    }
                  `}
                  onClick={() => setSelected(persona.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-300">
                      {persona.name[0]}
                    </div>
                    <Badge
                      variant={persona.tier.toLowerCase().replace('_', '-') as any}
                      style={{ borderColor: TIER_COLORS[persona.tier] + '40' }}
                    >
                      {persona.tier}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-slate-100 mb-1">{persona.business}</div>
                  <div className="text-xs text-slate-500 mb-3">{persona.city} • {persona.industry}</div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500">Score</span>
                    <span className="text-xl font-bold font-mono" style={{ color: TIER_COLORS[persona.tier] }}>
                      {persona.score}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{persona.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <Play className="h-3 w-3" /> Click to load full profile
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
            <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20 p-5 h-full flex flex-col items-center justify-center text-center hover:bg-slate-800/40 hover:border-slate-600 transition-all cursor-pointer">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-slate-300">Create Custom</div>
              <div className="text-xs text-slate-500 mt-1">Build your own applicant profile</div>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
