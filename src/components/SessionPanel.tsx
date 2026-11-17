import type { ReactNode } from 'react';
import type { ProgressRecord } from '../types';
import type { InitMode } from '../hooks/useLessonBridge';
import { formatDuration, quizLabel, screenLabel } from '../lib/format';
import { ProgressBar } from './ProgressBar';

function Row({ label, value, testId }: { label: string; value: ReactNode; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2 last:border-0">
      <dt className="label text-xs text-muted">{label}</dt>
      <dd className="text-right text-sm text-paper" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

const plural = (n: number, word: string) => `${word} ${n} time${n === 1 ? '' : 's'}`;

function warnings(rec: ProgressRecord): string[] {
  const { tabSwitches, idleCount, focusLost, awayMs } = rec.stats;
  const out: string[] = [];
  if (tabSwitches > 0) out.push(plural(tabSwitches, 'Switched away'));
  if (idleCount > 0) out.push(plural(idleCount, 'Idle'));
  if (focusLost > 0) out.push(plural(focusLost, 'Lost focus'));
  if (awayMs >= 60_000) out.push(`Away ${formatDuration(awayMs)}`);
  return out;
}

const modeLabel: Record<InitMode, string> = { new: 'New attempt', resume: 'Resumed', review: 'Review mode' };

export function SessionPanel({ record, mode }: { record: ProgressRecord | null; mode: InitMode | null }) {
  if (!record) {
    return <section className="rounded-2xl border border-line bg-panel p-5 text-sm text-muted">Loading progress…</section>;
  }
  const chips = warnings(record);
  const scenarioRating = typeof record.scenario?.rating === 'string' ? record.scenario.rating : null;

  return (
    <section className="rounded-2xl border border-line bg-panel p-5" aria-labelledby="tracking-heading" data-testid="session-panel">
      <div className="flex items-center justify-between gap-2">
        <h2 id="tracking-heading" className="text-sm text-paper">
          Session tracking
        </h2>
        {mode && <span className="label text-[11px] text-brand">{modeLabel[mode]}</span>}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ProgressBar percent={record.percent} complete={record.status === 'completed'} />
        <span className="font-display text-lg text-paper" data-testid="panel-percent">
          {record.percent}%
        </span>
      </div>

      <dl className="mt-3">
        <Row label="Current screen" value={screenLabel(record)} testId="panel-screen" />
        <Row label="Active time" value={formatDuration(record.stats.activeMs)} testId="panel-active" />
        <Row label="Tab switches" value={record.stats.tabSwitches} testId="panel-tabs" />
        <Row label="Time away" value={formatDuration(record.stats.awayMs)} testId="panel-away" />
        <Row label="Idle count" value={record.stats.idleCount} testId="panel-idle" />
        <Row label="Quiz result" value={quizLabel(record) ?? '–'} testId="panel-quiz" />
        {scenarioRating && <Row label="Scenario" value={scenarioRating} />}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2" data-testid="panel-warnings">
        {chips.length === 0 ? (
          <span className="label rounded-full border border-ok/40 bg-ok/10 px-2.5 py-1 text-[11px] text-ok">No warnings</span>
        ) : (
          chips.map((c) => (
            <span key={c} className="label rounded-full border border-bad/40 bg-bad/10 px-2.5 py-1 text-[11px] text-bad">
              ⚠ {c}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
