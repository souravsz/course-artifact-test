import type { ProgressRecord } from '../types';

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** One-based screen number for display. */
export const screenNumber = (rec: ProgressRecord) => rec.currentSlide + 1;

export function screenLabel(rec: ProgressRecord): string {
  return rec.totalSlides ? `${screenNumber(rec)} / ${rec.totalSlides}` : `${screenNumber(rec)}`;
}

export function quizLabel(rec: ProgressRecord): string | null {
  if (!rec.quiz) return null;
  const { score, total, percent, passed } = rec.quiz;
  return `${score}/${total} (${percent}%) · ${passed ? 'passed' : 'not passed'}`;
}

/** Short one-line summary of an event payload for the dev log. */
export function eventDetail(data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (k === 'suspendData') continue;
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') continue;
    const val = typeof v === 'number' && /ms$/i.test(k) ? formatDuration(v) : String(v);
    parts.push(`${k}: ${val}`);
    if (parts.length >= 4) break;
  }
  return parts.join(' · ');
}
