import { useEffect } from 'react';

export interface ToastMessage {
  id: number;
  title: string;
  body?: string;
}

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className="fixed right-4 bottom-4 z-50 max-w-sm" role="status" aria-live="polite">
      <div className="flex items-start gap-3 rounded-xl border border-ok/50 bg-panel p-4 shadow-2xl shadow-black/60">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ok text-sm font-bold text-ink">✓</span>
        <div className="min-w-0 flex-1">
          <div className="label text-sm text-paper">{toast.title}</div>
          {toast.body && <div className="mt-1 text-sm text-muted">{toast.body}</div>}
        </div>
        <button onClick={onDismiss} className="text-muted hover:text-paper" aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
