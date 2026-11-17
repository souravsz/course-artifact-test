export function ProgressBar({ percent, complete = false }: { percent: number; complete?: boolean }) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-panel-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-ok' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
