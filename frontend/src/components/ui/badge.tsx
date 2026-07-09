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
    strong: 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold',
    adequate: 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 font-bold',
    watch: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-bold',
    'high-risk': 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30 font-bold',
    high_risk: 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30 font-bold',
    pending: 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border)] font-semibold',
    approved: 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold',
    rejected: 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30 font-bold',
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
