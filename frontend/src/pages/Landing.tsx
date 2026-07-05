import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, TrendingUp, Users, BrainCircuit, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme, Theme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function Landing() {
  const { theme, setTheme } = useTheme();
  
  const themes: { id: Theme; label: string; icon: any }[] = [
    { id: 'noir', label: 'Noir', icon: Moon },
    { id: 'blanc', label: 'Blanc', icon: Sun },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              backgroundColor: "var(--accent)",
              opacity: 0.1,
              width: 4 + Math.random() * 8,
              height: 4 + Math.random() * 8,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--bg-page)] shadow-lg shadow-[var(--shadow-glow)]">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight">ArthNiti</div>
            <div className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wider">IDBI Innovate 2026</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-[var(--text-muted)] font-medium">Track 03 — Financial Inclusion</div>
          <div className="flex items-center gap-1 rounded-full p-1 border border-[var(--border)] bg-[var(--border-subtle)] transition-colors">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={`Switch to ${t.label}`}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
              </span>
              IDBI Innovate 2026 — Track 03 (Financial Inclusion)
            </div>
            <h1 className="text-5xl font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">
              AI-Driven MSME<br />
              <span className="text-[var(--accent)]">Financial Health</span><br />
              Assessment
            </h1>
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-lg">
              ArthNiti computes a multidimensional Financial Health Score from alternate data
              (GST, UPI, AA bank statements, EPFO) for businesses that traditional bureau-based
              underwriting rejects.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link to="/dashboard">
                <Button size="lg" variant="glow">
                  Enter Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard?demo=true">
                <Button size="lg" variant="outline">
                  <Play className="mr-2 h-4 w-4" /> Launch Demo
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> AA/OCEN/ULI Ready</span>
              <span className="flex items-center gap-1.5"><BrainCircuit className="h-3.5 w-3.5" /> XGBoost + SHAP</span>
              <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> No LLM in Sync Path</span>
            </div>

            {/* 3-step visual */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { step: '1', title: 'Consent', desc: 'One-click AA consent', icon: Shield },
                { step: '2', title: 'Score', desc: 'Real-time XGBoost', icon: TrendingUp },
                { step: '3', title: 'Offer', desc: 'Matched loan offers', icon: ArrowRight },
              ].map((item) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: parseInt(item.step) * 0.2 }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center"
                >
                  <div className="h-8 w-8 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] mx-auto mb-2">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold text-slate-200">{item.title}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right side feature cards */}
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 backdrop-blur">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Real-Time Scoring</div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                XGBoost core with SHAP explainability. No LLM in the synchronous scoring path.
                Sub-100ms inference on commodity hardware.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 backdrop-blur">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Account Aggregator (AA)</div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Real Finvu sandbox integration with ReBIT-spec FIU. JWE decryption, consent
                lifecycle, and DEPOSIT schema normalization implemented.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 backdrop-blur">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">XAI + Arth-Mitra TTS</div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Cross-checked LLM narratives with numeric hallucination detection. Bhashini →
                IndicTTS → browser fallback chain for vernacular voice.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--accent)]/5 p-3 text-xs text-[var(--accent)]/80 text-center">
              <strong>Demo honesty:</strong> AA is real sandbox. OCEN & ULI are spec-compliant stubs.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-[var(--border)] px-8 py-4 flex justify-between text-xs text-[var(--text-muted)]">
        <span>ArthNiti v1.4.0 — Hackathon PoC</span>
        <span>IDBI Bank Innovate 2026</span>
      </div>
    </div>
  );
}
