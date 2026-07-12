import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Briefcase, Store, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { PersonaKey, PERSONAS } from '@/context/AuthContext';

interface PersonaTransitionOverlayProps {
  personaKey: PersonaKey | null;
  onComplete?: () => void;
}

// Optional Web Audio API synthesized futuristic UI chirp (zero external dependencies)
function playPersonaSwitchAudio(roleKey: PersonaKey) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Different frequency signatures for different roles
    const baseFreq = roleKey === 'admin' ? 587.33 : roleKey === 'credit_officer' ? 523.25 : 440.0; // D5, C5, A4
    const endFreq = roleKey === 'admin' ? 880.0 : roleKey === 'credit_officer' ? 783.99 : 659.25;

    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch {
    // Silent fallback if audio context is blocked by browser policies
  }
}

export default function PersonaTransitionOverlay({ personaKey, onComplete }: PersonaTransitionOverlayProps) {
  const [activePersona, setActivePersona] = useState<PersonaKey | null>(null);

  useEffect(() => {
    if (personaKey) {
      setActivePersona(personaKey);
      playPersonaSwitchAudio(personaKey);
      const timer = setTimeout(() => {
        setActivePersona(null);
        onComplete?.();
      }, 1300);
      return () => clearTimeout(timer);
    }
  }, [personaKey, onComplete]);

  if (!activePersona) return null;

  const persona = PERSONAS[activePersona];

  const configMap: Record<PersonaKey, {
    color: string;
    glow: string;
    border: string;
    bgBadge: string;
    icon: React.ReactNode;
    subtitle: string;
    clearance: string;
  }> = {
    admin: {
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.4)',
      border: 'rgba(168, 85, 247, 0.5)',
      bgBadge: 'rgba(168, 85, 247, 0.15)',
      icon: <ShieldCheck className="h-8 w-8 text-[#a855f7]" />,
      subtitle: 'Root Administrator • System-Wide Oversight & Multi-Agent Auditing',
      clearance: 'LEVEL 5 • ROOT CLEARANCE',
    },
    credit_officer: {
      color: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.4)',
      border: 'rgba(6, 182, 212, 0.5)',
      bgBadge: 'rgba(6, 182, 212, 0.15)',
      icon: <Briefcase className="h-8 w-8 text-[#06b6d4]" />,
      subtitle: 'IDBI Bank Senior Underwriter • MSME Decision & Sanction Queue',
      clearance: 'LEVEL 3 • UNDERWRITING ENGINE',
    },
    applicant: {
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      border: 'rgba(16, 185, 129, 0.5)',
      bgBadge: 'rgba(16, 185, 129, 0.15)',
      icon: <Store className="h-8 w-8 text-[#10b981]" />,
      subtitle: 'MSME Borrower Self-Service • Financial Health Card & Instant Offers',
      clearance: 'BORROWER WORKSPACE • AA/GST LINKED',
    },
  };

  const currentConfig = configMap[activePersona];

  return (
    <AnimatePresence>
      {activePersona && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            setActivePersona(null);
            onComplete?.();
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-md cursor-pointer font-sans select-none"
        >
          {/* Cybernetic Scan Line */}
          <motion.div
            initial={{ y: '-100vh' }}
            animate={{ y: '100vh' }}
            transition={{ duration: 1.0, ease: 'easeInOut', repeat: 1 }}
            className="absolute inset-x-0 h-1.5 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${currentConfig.color}, transparent)`,
              boxShadow: `0 0 20px ${currentConfig.color}, 0 0 40px ${currentConfig.color}`,
            }}
          />

          {/* Futuristic Persona HUD Card */}
          <motion.div
            initial={{ scale: 0.75, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="relative overflow-hidden rounded-3xl border bg-[var(--bg-elevated)] p-8 shadow-2xl max-w-lg w-full mx-4 text-[var(--text-primary)]"
            style={{
              borderColor: currentConfig.border,
              boxShadow: `0 25px 60px -15px rgba(0,0,0,0.5), 0 0 35px ${currentConfig.glow}`,
            }}
          >
            {/* Top Scanning Status Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 animate-spin text-[var(--text-secondary)]" style={{ animationDuration: '4s' }} />
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--text-secondary)]">
                  CONTEXT SHIFT • ARTHNITI v1.4
                </span>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border"
                style={{
                  backgroundColor: currentConfig.bgBadge,
                  color: currentConfig.color,
                  borderColor: currentConfig.border,
                }}
              >
                {currentConfig.clearance}
              </span>
            </div>

            {/* Persona Identity Block */}
            <div className="flex items-center gap-5 mb-6">
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border bg-[var(--bg-card)] shadow-inner"
                style={{
                  borderColor: currentConfig.border,
                  boxShadow: `0 0 20px ${currentConfig.glow}`,
                }}
              >
                {currentConfig.icon}
              </motion.div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Active Persona Identity
                  </span>
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: currentConfig.color }} />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-[var(--text-primary)] mt-0.5">
                  {persona.name}
                </h3>
                <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
                  {persona.title}
                </p>
              </div>
            </div>

            {/* Subtitle Description */}
            <div
              className="rounded-2xl p-4 border text-xs font-medium leading-relaxed bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)]"
            >
              {currentConfig.subtitle}
            </div>

            {/* Progress Scanning Bar */}
            <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" style={{ color: currentConfig.color }} />
                Initializing workspace credentials...
              </span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="font-bold uppercase tracking-wider"
                style={{ color: currentConfig.color }}
              >
                ONLINE
              </motion.span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
