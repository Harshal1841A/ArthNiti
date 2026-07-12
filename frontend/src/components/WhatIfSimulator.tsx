import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Sliders } from 'lucide-react';

interface FeatureSlider {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  format: 'percent' | 'number' | 'money' | 'ratio';
}

const FEATURES: FeatureSlider[] = [
  { key: 'gst_filing_regularity_12mo', label: 'GST Filing Regularity', min: 0, max: 1, step: 0.05, format: 'percent' },
  { key: 'bounce_count_90d', label: 'Cheque/ACH Bounces (90d)', min: 0, max: 10, step: 1, format: 'number' },
  { key: 'avg_closing_balance', label: 'Average Closing Balance', min: 0, max: 100000, step: 5000, format: 'money' },
  { key: 'inflow_volatility_coefficient', label: 'Cashflow Volatility Coeff', min: 0, max: 1, step: 0.05, format: 'percent' },
  { key: 'payment_time_consistency_score', label: 'Repayment Consistency Score', min: 0, max: 1, step: 0.05, format: 'percent' },
  { key: 'existing_emi_to_inflow_ratio', label: 'EMI to Income Burden Ratio', min: 0, max: 1, step: 0.05, format: 'percent' },
];

interface WhatIfSimulatorProps {
  initialValues: Record<string, number>;
  onChange: (values: Record<string, number>) => void;
}

function formatValue(value: number, format: string): string {
  if (format === 'percent') return `${(value * 100).toFixed(0)}%`;
  if (format === 'money') return `₹${value.toLocaleString()}`;
  if (format === 'ratio') return `${value.toFixed(2)}`;
  return `${value}`;
}

function computeScore(features: Record<string, number>): { score: number; tier: string } {
  const bounce = features.bounce_count_90d ?? 0;
  const vol = features.inflow_volatility_coefficient ?? 0.5;
  const neg = features.days_with_negative_balance_90d ?? 0;
  const gst = features.gst_filing_regularity_12mo ?? 0.5;
  const pay = features.payment_time_consistency_score ?? 0.5;
  const bal = features.avg_closing_balance ?? 50000;
  const emi = features.existing_emi_to_inflow_ratio ?? 0.3;

  const score = Math.max(0, Math.min(100, Math.round(
    50
    - bounce * 8
    - vol * 25
    - neg * 4
    + gst * 25
    + pay * 20
    + (bal / 100000) * 15
    - emi * 15
  )));

  const tier = score >= 75 ? 'STRONG' : score >= 50 ? 'ADEQUATE' : score >= 25 ? 'WATCH' : 'HIGH_RISK';
  return { score, tier };
}

function tierColor(tier: string): string {
  switch (tier) {
    case 'STRONG': return '#10b981';
    case 'ADEQUATE': return '#f59e0b';
    case 'WATCH': return '#f97316';
    case 'HIGH_RISK': return '#ef4444';
    default: return '#38bdf8';
  }
}

export default function WhatIfSimulator({ initialValues, onChange }: WhatIfSimulatorProps) {
  const [values, setValues] = useState<Record<string, number>>(initialValues);
  const [originalValues] = useState<Record<string, number>>(initialValues);

  const handleChange = useCallback((key: string, val: number) => {
    const next = { ...values, [key]: val };
    setValues(next);
    onChange(next);
  }, [values, onChange]);

  const handleReset = () => {
    setValues(originalValues);
    onChange(originalValues);
  };

  const hasChanges = Object.keys(values).some((k) => values[k] !== originalValues[k]);
  const currentSim = computeScore(values);
  const baselineSim = computeScore(originalValues);
  const delta = currentSim.score - baselineSim.score;

  return (
    <div className="glass-card p-6 border border-[var(--border)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-6">
        <div>
          <h3 className="text-lg font-serif font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-[var(--accent-gold)]" /> What-If Sandbox Simulator
          </h3>
          <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">Real-time counterfactual credit score simulation</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Revert Baseline
          </button>
        )}
      </div>

      {/* Live Counterfactual Simulation HUD Box */}
      <div className="mb-6 p-4 rounded-xl border border-[#334155] bg-[#0f172a] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3.5 py-2 rounded-lg border" style={{ borderColor: `${tierColor(currentSim.tier)}50`, backgroundColor: `${tierColor(currentSim.tier)}15` }}>
            <div className="text-[10px] font-mono text-[#94a3b8] uppercase">Simulated Score</div>
            <div className="text-2xl font-mono font-black" style={{ color: tierColor(currentSim.tier) }}>
              {currentSim.score} <span className="text-xs font-normal text-[#94a3b8]">/ 100</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border" style={{ color: tierColor(currentSim.tier), borderColor: `${tierColor(currentSim.tier)}40`, backgroundColor: `${tierColor(currentSim.tier)}15` }}>
                {currentSim.tier}
              </span>
              <span className="text-xs font-mono text-[#94a3b8]">
                Baseline: {baselineSim.score} ({baselineSim.tier})
              </span>
            </div>
            <div className="text-xs font-mono mt-1 text-[#cbd5e1]">
              Move sliders below to test real-time underwriting scenarios
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {delta !== 0 ? (
            <span className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs border ${
              delta > 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {delta > 0 ? `▲ +${delta} pts vs Baseline` : `▼ ${delta} pts vs Baseline`}
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-lg font-mono font-bold text-xs bg-slate-800 text-slate-300 border border-slate-700">
              ● At Baseline
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {FEATURES.map((f) => {
          const val = values[f.key] ?? f.min;
          return (
            <div key={f.key} className="space-y-2 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-page)]/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">{f.label}</label>
                <span className="text-xs font-mono font-bold text-[var(--accent-emerald)] bg-[var(--accent-emerald)]/10 px-2 py-0.5 rounded border border-[var(--accent-emerald)]/30">{formatValue(val, f.format)}</span>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={val}
                onChange={(e) => handleChange(f.key, parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[var(--border)] accent-[var(--accent-emerald)]"
              />
            </div>
          );
        })}
      </div>

      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between"
        >
          <div className="text-xs font-mono text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
            Active counterfactual override — AI underwriting models and SHAP matrices are recalculated live.
          </div>
          <button
            onClick={handleReset}
            className="text-xs font-mono text-[var(--accent-gold)] underline hover:text-[var(--text-primary)] cursor-pointer"
          >
            Reset All Sliders
          </button>
        </motion.div>
      )}
    </div>
  );
}
