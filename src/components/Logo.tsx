export function Star({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M12 1.6l3.05 6.6 7.2.8-5.35 4.9 1.5 7.1L12 17.4 5.6 21l1.5-7.1L1.75 9l7.2-.8z" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <Star className="h-8 w-8 shrink-0 text-brand" />
      <div className="leading-none">
        <div className="font-display text-[15px] uppercase tracking-wide text-paper">We The Change Makers</div>
        <div className="label mt-1 text-[11px] text-brand">Real stewards. Real communities.</div>
      </div>
    </div>
  );
}
