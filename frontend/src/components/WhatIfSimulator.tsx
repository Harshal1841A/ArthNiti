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
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Revert Baseline
          </button>
        )}
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
          className="mt-6 pt-4 border-t border-[var(--border-subtle)]"
        >
          <div className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-gold)] animate-pulse" />
            Active counterfactual override — AI underwriting models and SHAP matrices are recalculated live.
          </div>
        </motion.div>
      )}
    </div>
  );
}
