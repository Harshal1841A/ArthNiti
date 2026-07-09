import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text-primary)]">Loading...</span>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-600 dark:text-rose-300 flex items-start gap-3">
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-rose-500" />
      <div>
        <div className="font-bold mb-0.5 text-[var(--text-primary)]">Something went wrong</div>
        {message}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center shadow-sm">
      <Inbox className="h-10 w-10 text-[var(--text-secondary)] mb-3" />
      <p className="text-sm font-bold text-[var(--text-primary)]">{message}</p>
    </div>
  );
}
