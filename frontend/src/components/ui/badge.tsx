import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'strong' | 'adequate' | 'watch' | 'high-risk' | 'high_risk' | 'pending' | 'approved' | 'rejected';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--bg-card-hover)] text-[var(--text-primary)] border-[var(--border)] font-bold',
    secondary: 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] font-semibold',
    destructive: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold',
    outline: 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold',
    strong: 'bg-tier-strong/15 text-tier-strong border border-tier-strong/30 font-bold',
    adequate: 'bg-tier-adequate/15 text-tier-adequate border border-tier-adequate/30 font-bold',
    watch: 'bg-tier-watch/15 text-tier-watch border border-tier-watch/30 font-bold',
    'high-risk': 'bg-tier-high-risk/15 text-tier-high-risk border border-tier-high-risk/30 font-bold',
    high_risk: 'bg-tier-high-risk/15 text-tier-high-risk border border-tier-high-risk/30 font-bold',
    pending: 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border)] font-semibold',
    approved: 'bg-tier-strong/15 text-tier-strong border border-tier-strong/30 font-bold',
    rejected: 'bg-tier-high-risk/15 text-tier-high-risk border border-tier-high-risk/30 font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
