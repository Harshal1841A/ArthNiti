import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'strong' | 'adequate' | 'watch' | 'high-risk' | 'high_risk' | 'pending' | 'approved' | 'rejected';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-800 text-slate-100 border-slate-700',
    secondary: 'bg-slate-700 text-slate-200 border-slate-600',
    destructive: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    outline: 'border-slate-600 bg-slate-800/50 text-slate-300',
    strong: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    adequate: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    watch: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    'high-risk': 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    high_risk: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    pending: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    rejected: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
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
