import { useState } from 'react';
import type { LoggedEvent } from '../types';
import { eventDetail, formatClock } from '../lib/format';

export function EventLog({ events }: { events: LoggedEvent[] }) {
  const [open, setOpen] = useState(false);
  const latest = [...events].reverse();

  return (
    <section className="rounded-2xl border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="label text-sm text-paper">Event log (dev)</span>
        <span className="label text-xs text-muted">
          {events.length} · {open ? 'Hide' : 'Show'}
        </span>
      </button>
      {open && (
        <ol className="max-h-80 overflow-y-auto border-t border-line px-3 py-2 font-mono text-[11px]" data-testid="event-log">
          {latest.length === 0 && <li className="px-2 py-2 text-muted">No events yet.</li>}
          {latest.map((e, i) => (
            <li key={`${e.at}-${i}`} className={`grid grid-cols-[auto_1fr] gap-x-2 rounded px-2 py-1 ${e.ignored ? 'opacity-50' : ''}`}>
              <span className="text-muted">{formatClock(e.at)}</span>
              <span className={e.type.startsWith('host:') ? 'text-brand' : 'text-paper'}>
                {e.type}
                {e.ignored && ' (ignored)'}
                {e.slide !== null && <span className="text-muted"> · s{e.slide + 1}</span>}
              </span>
              <span />
              <span className="truncate text-muted" title={eventDetail(e.data)}>
                {eventDetail(e.data)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
