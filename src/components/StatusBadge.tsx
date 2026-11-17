import type { ProgressRecord } from '../types';

type Tone = 'muted' | 'brand' | 'ok' | 'bad';

const toneClass: Record<Tone, string> = {
  muted: 'border-line bg-panel-2 text-muted',
  brand: 'border-brand/40 bg-brand/10 text-brand',
  ok: 'border-ok/40 bg-ok/10 text-ok',
  bad: 'border-bad/40 bg-bad/10 text-bad',
};

export function statusOf(rec: ProgressRecord | null | undefined): { label: string; tone: Tone } {
  if (!rec || rec.status === 'not_started') return { label: 'Not started', tone: 'muted' };
  if (rec.status === 'in_progress') return { label: 'In progress', tone: 'brand' };
  if (rec.success === 'failed') return { label: 'Completed · Not passed', tone: 'bad' };
  if (rec.success === 'passed') return { label: 'Completed · Passed', tone: 'ok' };
  return { label: 'Completed', tone: 'ok' };
}

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`label inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] whitespace-nowrap ${toneClass[tone]}`}>
      {label}
    </span>
  );
}

export function StatusBadge({ record, locked = false }: { record: ProgressRecord | null | undefined; locked?: boolean }) {
  if (locked) return <Badge label="Coming soon" tone="muted" />;
  return <Badge {...statusOf(record)} />;
}
