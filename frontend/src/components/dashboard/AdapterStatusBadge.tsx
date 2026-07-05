import { cn } from '@/lib/utils';

export interface AdapterStatusBadgeProps {
  state: 'real' | 'stub' | 'unconfirmed';
  label: string;
  className?: string;
}

export function AdapterStatusBadge({ state, label, className }: AdapterStatusBadgeProps) {
  const config = {
    real: {
      text: 'REAL, connected',
      color: 'var(--real-badge)',
      hasDot: true,
      fontWeight: 500,
    },
    stub: {
      text: 'SPEC-COMPLIANT, mocked',
      color: 'var(--stub-badge)',
      hasDot: false,
      fontWeight: 400,
    },
    unconfirmed: {
      text: 'UNCONFIRMED — verify before demo',
      color: 'var(--unconfirmed-badge)',
      hasDot: false,
      fontWeight: 400,
    },
  };

  const { text, color, hasDot, fontWeight } = config[state];

  return (
    <span className={cn('text-sm font-mono inline-flex items-center gap-1.5', className)}>
      {hasDot && (
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span style={{ color: hasDot ? 'var(--text-primary)' : color, fontWeight }}>
        {label}: {text}
      </span>
    </span>
  );
}
