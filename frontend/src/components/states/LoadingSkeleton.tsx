import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        <span className="text-sm font-medium text-slate-300">Loading...</span>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-5 text-sm text-red-300 flex items-start gap-3">
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
      <div>
        <div className="font-semibold mb-0.5 text-red-200">Something went wrong</div>
        {message}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/40 p-12 text-center">
      <Inbox className="h-10 w-10 text-slate-500 mb-3" />
      <p className="text-sm font-medium text-slate-400">{message}</p>
    </div>
  );
}
