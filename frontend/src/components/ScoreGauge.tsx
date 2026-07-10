import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { tierColor } from '@/lib/tierColors';


interface ScoreGaugeProps {
  score: number;
  tier: string;
  size?: number;
  duration?: number;
}

export default function ScoreGauge({ score, tier, size = 200, duration = 1.5 }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const progress = useMotionValue(0);
  const color = tierColor(tier);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const controls = animate(0, score, {
      duration,
      ease: 'easeOut',
      onUpdate: (v: number) => setDisplayScore(Math.round(v)),
    });
    const progressAnimation = animate(0, score / 100, {
      duration,
      ease: 'easeOut',
      onUpdate: (v: number) => progress.set(v),
    });

    return () => {
      controls.stop();
      progressAnimation.stop();
    };
  }, [score, duration, progress]);

  const strokeDashoffset = useTransform(progress, (v) => circumference * (1 - v));

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth={12}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-4xl font-bold font-mono"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {displayScore}
        </motion.span>
        <span className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">/ 100</span>
      </div>
      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 30px ${color}20` }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}
