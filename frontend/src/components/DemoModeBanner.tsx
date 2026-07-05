import { X } from 'lucide-react';
import { useState } from 'react';

export default function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative flex items-center justify-center gap-3 px-4 py-1.5 bg-[var(--bg)] border-b border-[var(--border)] text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]" />
      </span>
      <span>DEMO MODE // ALL DATA PRE-LOADED FOR TELEMETRY & DECISIONING DEMONSTRATION</span>
      <button onClick={() => setDismissed(true)} className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
